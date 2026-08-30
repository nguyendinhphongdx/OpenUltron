from __future__ import annotations

from dataclasses import dataclass, field

from langchain.agents import create_agent
from langchain.agents.middleware import AgentMiddleware, HumanInTheLoopMiddleware
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.graph.state import CompiledStateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.checkpointer import get_checkpointer
from app.core.providers import build_chat_model
from app.modules.tool.builder import TOOLS_REQUIRING_APPROVAL, ToolSpec, build_tools

# Chặn đa tầng chạy vô hạn nếu lỡ có cycle lọt qua check ở AgentService (phòng thủ kép — check
# chính vẫn là AgentService._creates_cycle lúc tạo AgentDelegation, đây chỉ là lưới an toàn).
MAX_DELEGATION_DEPTH = 5


@dataclass
class ModelConfig:
    """DTO thuần — tách graph khỏi ORM `Model` (ADR-0007)."""

    provider: str
    model_id: str
    base_url: str | None = None


@dataclass
class KnowledgeBaseSpec:
    """DTO thuần — tách graph khỏi ORM `KnowledgeBase`. KB gán cho agent qua `AgentKnowledgeBase`
    (quan hệ riêng, khác `Tool`/`AgentTool` — ADR-0013), map trực tiếp sang 1 tool RAG tự động
    trong `_build_kb_search_tool`, không đi qua `ToolBuilder` registry."""

    id: int
    slug: str
    name: str
    description: str | None


@dataclass
class SubAgentSpec:
    """DTO thuần — tách graph khỏi ORM `Agent` (ADR-0006/0007). Đa tầng: 1 sub-agent có thể tự nó
    là orchestrator của các sub-agent khác (`sub_agents`), đệ quy tới khi hết cây delegation.
    """

    slug: str
    description: str | None
    system_prompt: str
    model: ModelConfig
    sub_agents: list[SubAgentSpec] = field(default_factory=list)
    tools: list[ToolSpec] = field(default_factory=list)
    knowledge_bases: list[KnowledgeBaseSpec] = field(default_factory=list)


async def run_sub_agent(
    sub_agent: SubAgentSpec, task: str, *, session: AsyncSession, depth: int = 0
) -> str:
    """Chạy 1 sub-agent với 1 task, trả text kết quả — dùng lại được ở bất kỳ chỗ nào cần
    delegate cho sub-agent (LangGraph tool cho text chat, hoặc toolCall từ voice module —
    ADR-0009 — không viết lại logic delegate riêng cho voice). `session` dùng để tra credential
    provider (ADR-0010) khi build chat model — không mở session riêng ở đây."""
    chat_model = await build_chat_model(
        provider=sub_agent.model.provider,
        model_id=sub_agent.model.model_id,
        base_url=sub_agent.model.base_url,
        session=session,
    )
    nested_tools = (
        [_build_sub_agent_tool(sa, session=session, depth=depth + 1) for sa in sub_agent.sub_agents]
        if depth < MAX_DELEGATION_DEPTH
        else []
    )
    # KHÔNG gắn checkpointer/middleware approval gate (ADR-0014) ở đây có chủ đích — sub-agent
    # chạy đồng bộ bên trong 1 lần gọi tool của agent cha (`_build_sub_agent_tool`), pause lồng
    # trong lúc agent cha đang chạy là bài toán phức tạp hơn hẳn (nested interrupt), ngoài phạm vi
    # spec `tool-approval-gate.md`. Vì không có gate ở tầng này, tool rủi ro cao KHÔNG được gán cho
    # sub-agent luôn (fail-closed — addendum 2026-08-30, ADR-0014): loại tool trong
    # `TOOLS_REQUIRING_APPROVAL`/`kind=mcp` trước khi build, thay vì gọi được nhưng không ai duyệt.
    safe_tools = [
        t for t in sub_agent.tools if t.slug not in TOOLS_REQUIRING_APPROVAL and t.kind != "mcp"
    ]
    own_tools = await build_tools(safe_tools, session=session)
    kb_tools = [_build_kb_search_tool(kb, session=session) for kb in sub_agent.knowledge_bases]
    executor = create_agent(
        chat_model,
        tools=[*own_tools, *nested_tools, *kb_tools],
        system_prompt=sub_agent.system_prompt,
    )
    result = await executor.ainvoke({"messages": [HumanMessage(content=task)]})
    return str(result["messages"][-1].content)


_KB_SEARCH_TOP_K = 3


def _build_kb_search_tool(kb: KnowledgeBaseSpec, *, session: AsyncSession):
    """Tool RAG tự động cho 1 `KnowledgeBase` đã gán agent
    (docs/features/knowledge-base-chat-wiring.md) — không đi qua `Tool`/`ToolBuilder` registry
    (ADR-0013), KB gán qua `AgentKnowledgeBase`, khác cơ chế `Tool` do user tự tạo. Build
    `KnowledgeBaseService` inline từ `session` (cùng pattern
    `app/core/providers.py::get_provider_api_key` — lazy import tránh vòng import module)."""

    @tool(
        f"search-knowledge-base-{kb.slug}",
        description=(
            f"Tìm thông tin liên quan trong knowledge base '{kb.name}'"
            + (f" — {kb.description}" if kb.description else "")
        ),
    )
    async def _search(query: str) -> str:
        from app.modules.agent.repository import AgentRepository
        from app.modules.agent.service import AgentService
        from app.modules.knowledge_base.repository import KnowledgeBaseRepository
        from app.modules.knowledge_base.service import KnowledgeBaseService
        from app.modules.model.repository import ModelRepository
        from app.modules.model.service import ModelService

        model_service = ModelService(ModelRepository(session))
        agent_service = AgentService(AgentRepository(session), model_service)
        kb_service = KnowledgeBaseService(
            KnowledgeBaseRepository(session), model_service, agent_service
        )
        results = await kb_service.search(kb.id, query, top_k=_KB_SEARCH_TOP_K)
        if not results:
            return "Không tìm thấy thông tin liên quan trong knowledge base."
        return "\n\n---\n\n".join(r.chunk.content for r in results)

    return _search


def _build_sub_agent_tool(sub_agent: SubAgentSpec, *, session: AsyncSession, depth: int = 0):
    """Bọc 1 sub-agent thành LangGraph tool cho orchestrator gọi (ADR-0006, đa tầng)."""

    @tool(
        sub_agent.slug, description=sub_agent.description or f"Delegate task to '{sub_agent.slug}'"
    )
    async def _delegate(task: str) -> str:
        return await run_sub_agent(sub_agent, task, session=session, depth=depth)

    return _delegate


def _human_in_the_loop_middleware(tools: list[ToolSpec]) -> list[AgentMiddleware]:
    """Approval gate (ADR-0014) — builtin tool nguy hiểm gate theo slug cố định
    (`TOOLS_REQUIRING_APPROVAL`, biết trước vì Ultron tự viết). `kind=mcp` (ADR-0017) gate theo
    `kind`, không theo slug — slug do user tự đặt tuỳ ý khi khai `Tool`, không thể liệt kê trước;
    MCP server là process/dịch vụ ngoài, Ultron không biết trước nó làm gì nên mọi tool loại này
    đều bắt buộc qua duyệt. Không có tool nào cần gate → không thêm middleware (không ảnh hưởng
    turn bình thường)."""
    gated = [t.slug for t in tools if t.slug in TOOLS_REQUIRING_APPROVAL or t.kind == "mcp"]
    if not gated:
        return []
    return [
        HumanInTheLoopMiddleware(
            interrupt_on={slug: {"allowed_decisions": ["approve", "reject"]} for slug in gated}
        )
    ]


async def build_agent_executor(
    *,
    system_prompt: str,
    model: ModelConfig,
    sub_agents: list[SubAgentSpec],
    tools: list[ToolSpec],
    knowledge_bases: list[KnowledgeBaseSpec],
    session: AsyncSession,
) -> CompiledStateGraph:
    """Graph cho 1 turn — orchestrator có thêm tool gọi sub-agent (ADR-0006) + tool thật gán trực
    tiếp cho agent top-level (`tools`, ADR-0013) + tool RAG tự động cho KB đã gán
    (`knowledge_bases`, docs/features/knowledge-base-chat-wiring.md). `session` dùng để tra
    credential provider (ADR-0010) khi build chat model chính + mọi sub-agent lồng bên dưới.
    `checkpointer` (ADR-0014) luôn gắn — rẻ, không ảnh hưởng turn không có tool cần duyệt; chỉ tool
    trong `TOOLS_REQUIRING_APPROVAL` mới thực sự pause."""
    chat_model = await build_chat_model(
        provider=model.provider, model_id=model.model_id, base_url=model.base_url, session=session
    )
    sub_agent_tools = [_build_sub_agent_tool(sa, session=session) for sa in sub_agents]
    kb_tools = [_build_kb_search_tool(kb, session=session) for kb in knowledge_bases]
    all_tools = [*(await build_tools(tools, session=session)), *sub_agent_tools, *kb_tools]
    return create_agent(
        chat_model,
        tools=all_tools,
        system_prompt=system_prompt,
        checkpointer=get_checkpointer(),
        middleware=_human_in_the_loop_middleware(tools),
    )
