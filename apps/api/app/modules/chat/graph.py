from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Annotated, Any, Literal, NotRequired, TypedDict

from langchain.agents import create_agent
from langchain.agents.middleware import AgentMiddleware, HumanInTheLoopMiddleware
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import ToolNode
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.checkpointer import get_checkpointer
from app.core.providers import build_chat_model
from app.modules.tool.builder import TOOLS_REQUIRING_APPROVAL, ToolSpec, build_tools

ExecutionStrategy = Literal["react", "plan_execute"]

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
    # Id của `AgentDelegation` (cạnh orchestrator → sub-agent này) — `None` khi resolve ngoài
    # context 1 cạnh cụ thể. Dùng để ghi "lần chạy gần nhất" (orchestrator-v2.md Phase C) — KHÔNG
    # dùng cho logic thực thi, chỉ để `_build_sub_agent_tool` biết ghi trace vào đâu.
    delegation_id: int | None = None


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
    # Sub-agent KHÔNG surface citation (Non-goal v1, docs/features/kb-citation.md) — `sources`
    # mặc định `None`, tool trả text chunk trơn, không bọc `<source id="N">`.
    kb_tools = [_build_kb_search_tool(kb, session=session) for kb in sub_agent.knowledge_bases]
    executor = create_agent(
        chat_model,
        tools=[*own_tools, *nested_tools, *kb_tools],
        system_prompt=sub_agent.system_prompt,
    )
    result = await executor.ainvoke({"messages": [HumanMessage(content=task)]})
    return str(result["messages"][-1].content)


_KB_SEARCH_TOP_K = 3
_CITATION_SNIPPET_MAX_LEN = 400


def _truncate_snippet(content: str, max_len: int = _CITATION_SNIPPET_MAX_LEN) -> str:
    if len(content) <= max_len:
        return content
    return content[: max_len - 1].rstrip() + "…"


def _build_kb_search_tool(
    kb: KnowledgeBaseSpec, *, session: AsyncSession, sources: list[dict] | None = None
):
    """Tool RAG tự động cho 1 `KnowledgeBase` đã gán agent
    (docs/features/knowledge-base-chat-wiring.md) — không đi qua `Tool`/`ToolBuilder` registry
    (ADR-0013), KB gán qua `AgentKnowledgeBase`, khác cơ chế `Tool` do user tự tạo. Build
    `KnowledgeBaseService` inline từ `session` (cùng pattern
    `app/core/providers.py::get_provider_api_key` — lazy import tránh vòng import module).

    `sources` là list dùng chung cho CẢ TURN (docs/features/kb-citation.md) — mỗi chunk trả về
    được append vào đây với id = thứ tự xuất hiện xuyên suốt turn (không reset theo từng lần gọi
    tool, để model cite `[cite:N]` không đụng số dù gọi KB nhiều lần). Chunk đồng thời được bọc
    `<source id="N">` trong text trả cho model — model soi id đó để cite, KHÔNG dùng chunk id thật
    trong DB (khó nhớ/dễ bịa hơn số thứ tự nhỏ, theo kinh nghiệm Open WebUI). `None` (mặc định,
    dùng ở `run_sub_agent` — Non-goal v1, sub-agent không surface citation) = không track/bọc tag,
    trả text chunk trơn — sub-agent không có `_KB_CITATION_INSTRUCTION` trong system prompt nên
    tag `<source id="N">` với nó chỉ là nhiễu vô nghĩa, không phải chỗ dự phòng cho tương lai."""

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

        if sources is None:
            return "\n\n---\n\n".join(r.chunk.content for r in results)

        blocks: list[str] = []
        for r in results:
            n = len(sources) + 1
            sources.append(
                {
                    "id": n,
                    "kb_id": kb.id,
                    "kb_name": kb.name,
                    "file_id": r.chunk.file_id,
                    "file_name": r.file_name,
                    "chunk_id": r.chunk.id,
                    "snippet": _truncate_snippet(r.chunk.content),
                    "score": r.score,
                }
            )
            blocks.append(f'<source id="{n}">\n{r.chunk.content}\n</source>')
        return "\n\n".join(blocks)

    return _search


def _build_sub_agent_tool(sub_agent: SubAgentSpec, *, session: AsyncSession, depth: int = 0):
    """Bọc 1 sub-agent thành LangGraph tool cho orchestrator gọi (ADR-0006, đa tầng)."""

    @tool(
        sub_agent.slug, description=sub_agent.description or f"Delegate task to '{sub_agent.slug}'"
    )
    async def _delegate(task: str) -> str:
        start = time.monotonic()
        try:
            output = await run_sub_agent(sub_agent, task, session=session, depth=depth)
        except Exception as exc:
            await _record_delegation_run(sub_agent, session=session, start=start, error=str(exc))
            raise
        await _record_delegation_run(sub_agent, session=session, start=start, output=output)
        return output

    return _delegate


async def _record_delegation_run(
    sub_agent: SubAgentSpec,
    *,
    session: AsyncSession,
    start: float,
    output: str | None = None,
    error: str | None = None,
) -> None:
    """Ghi "lần chạy gần nhất" của cạnh delegation này (docs/features/orchestrator-v2.md Phase C)
    — no-op khi `sub_agent` không gắn với 1 cạnh cụ thể (vd resolve ngoài context orchestrator).
    Lazy import + build `AgentService` inline — cùng pattern `_build_kb_search_tool`."""
    if sub_agent.delegation_id is None:
        return
    from app.modules.agent.repository import AgentRepository
    from app.modules.agent.service import AgentService
    from app.modules.model.repository import ModelRepository
    from app.modules.model.service import ModelService

    model_service = ModelService(ModelRepository(session))
    agent_service = AgentService(AgentRepository(session), model_service)
    duration_ms = int((time.monotonic() - start) * 1000)
    await agent_service.record_delegation_run(
        sub_agent.delegation_id, output=output, error=error, duration_ms=duration_ms
    )


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


class PlanExecuteState(TypedDict):
    """State cho graph `plan_execute` (ADR-0021) — mở rộng `messages` chuẩn của LangGraph thêm 3
    field theo dõi tiến độ kế hoạch. `plan`/`current_step`/`step_results` luôn được `planner` ghi
    đè lúc bắt đầu turn (kể cả khi checkpointer còn giữ giá trị từ turn trước, vì `planner` luôn là
    entry node của 1 lần invoke KHÔNG resume) — không cần reset tay ở nơi khác."""

    messages: Annotated[list[Any], add_messages]
    plan: NotRequired[list[str]]
    current_step: NotRequired[int]
    step_results: NotRequired[list[str]]


class _PlanOutput(BaseModel):
    steps: list[str]


_PLAN_INSTRUCTION = (
    "Liệt kê các bước cụ thể, tuần tự cần làm để hoàn thành yêu cầu của user. Mỗi bước là 1 việc "
    "rõ ràng, có thể tự thực hiện (có thể cần gọi tool). Không cần quá chi tiết — 2-6 bước là đủ."
)


def _message_text(content: str | list) -> str:
    """Trích text từ `AIMessage.content` — bản sao nhỏ của
    `app/core/agent_runtime.py::_extract_text` (không import chéo được: `agent_runtime.py` đã
    import module này, xem `AgentRunConfig`). Content dạng list-block xảy ra với model có
    "thinking"/tool-signature (Gemini 2.5+)."""
    if isinstance(content, str):
        return content
    return "".join(
        block["text"]
        for block in content
        if isinstance(block, dict) and block.get("type") == "text"
    )


async def build_plan_execute_executor(
    *,
    system_prompt: str,
    model: ModelConfig,
    sub_agents: list[SubAgentSpec],
    tools: list[ToolSpec],
    knowledge_bases: list[KnowledgeBaseSpec],
    session: AsyncSession,
    citation_sources: list[dict] | None = None,
) -> CompiledStateGraph:
    """Graph Plan-Execute (ADR-0021) — thay vì ReAct interleave (model tự quyết từng bước), agent
    lập 1 danh sách bước TRƯỚC (`planner`), rồi thực thi TUẦN TỰ từng bước; mỗi bước tự lặp ReAct
    (model ⇄ tools) tự do, không giới hạn 1 lần gọi tool/bước (ADR-0021 mục 2). Cùng tập
    tool/sub-agent/KB + approval gate (`HumanInTheLoopMiddleware`, ADR-0014) như
    `build_agent_executor` — node `approval` gọi thẳng `middleware.after_model` (cùng 1 instance,
    KHÔNG viết lại logic duyệt riêng cho nhánh này, xem ADR-0021 mục 3) — chỉ khác shape điều phối.

    Node `model` streaming ra text ở MỌI bước (không chỉ bước cuối) — do tầng streaming
    (`agent_runtime.py::_stream_turn`, ADR-0020) generic theo `on_chat_model_stream`, không phân
    biệt node nào phát ra; đây là đặc điểm chấp nhận được của v1 (user thấy agent "tường thuật" qua
    từng bước trước khi tới câu trả lời tổng hợp ở `synthesize`), không phải bug."""
    chat_model = await build_chat_model(
        provider=model.provider, model_id=model.model_id, base_url=model.base_url, session=session
    )
    sub_agent_tools = [_build_sub_agent_tool(sa, session=session) for sa in sub_agents]
    kb_tools = [
        _build_kb_search_tool(kb, session=session, sources=citation_sources)
        for kb in knowledge_bases
    ]
    all_tools = [*(await build_tools(tools, session=session)), *sub_agent_tools, *kb_tools]
    bound_model = chat_model.bind_tools(all_tools) if all_tools else chat_model

    async def _planner_node(state: PlanExecuteState) -> dict[str, Any]:
        plan_model = chat_model.with_structured_output(_PlanOutput)
        result = await plan_model.ainvoke(
            [SystemMessage(content=f"{system_prompt}\n\n{_PLAN_INSTRUCTION}"), *state["messages"]]
        )
        steps = result.steps if isinstance(result, _PlanOutput) else result["steps"]
        return {
            "plan": steps or ["Trả lời trực tiếp yêu cầu của user"],
            "current_step": 0,
            "step_results": [],
        }

    def _inject_step_node(state: PlanExecuteState) -> dict[str, Any]:
        step_text = state["plan"][state["current_step"]]
        prior = state.get("step_results", [])
        if prior:
            summary = "\n".join(f"- Bước {i + 1}: {r}" for i, r in enumerate(prior))
            content = f"Bước tiếp theo cần làm: {step_text}\n\nKết quả các bước trước:\n{summary}"
        else:
            content = f"Bước cần làm: {step_text}"
        return {"messages": [HumanMessage(content=content)]}

    async def _model_node(state: PlanExecuteState) -> dict[str, Any]:
        messages = [SystemMessage(content=system_prompt), *state["messages"]]
        response = await bound_model.ainvoke(messages)
        return {"messages": [response]}

    def _step_advance_node(state: PlanExecuteState) -> dict[str, Any]:
        messages = state["messages"]
        last = messages[-1] if messages else None
        result_text = _message_text(last.content) if isinstance(last, AIMessage) else ""
        return {
            "step_results": [*state.get("step_results", []), result_text],
            "current_step": state["current_step"] + 1,
        }

    async def _synthesize_node(state: PlanExecuteState) -> dict[str, Any]:
        plan = state["plan"]
        step_results = state.get("step_results", [])
        summary = "\n\n".join(
            f"Bước {i + 1}: {step}\nKết quả: {result}"
            for i, (step, result) in enumerate(zip(plan, step_results, strict=False))
        )
        prompt = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=(
                    "Đã thực hiện xong kế hoạch sau — tổng hợp thành câu trả lời cuối cùng cho "
                    f"user:\n\n{summary}"
                )
            ),
        ]
        response = await chat_model.ainvoke(prompt)
        return {"messages": [response]}

    def _route_after_model(state: PlanExecuteState) -> str:
        messages = state["messages"]
        last = messages[-1] if messages else None
        return "tools" if isinstance(last, AIMessage) and last.tool_calls else "step_advance"

    def _route_after_step_advance(state: PlanExecuteState) -> str:
        return "inject_step" if state["current_step"] < len(state["plan"]) else "synthesize"

    graph = StateGraph(PlanExecuteState)
    graph.add_node("planner", _planner_node)
    graph.add_node("inject_step", _inject_step_node)
    graph.add_node("model", _model_node)
    graph.add_node("step_advance", _step_advance_node)
    graph.add_node("synthesize", _synthesize_node)
    if all_tools:
        graph.add_node("tools", ToolNode(all_tools))

    graph.add_edge(START, "planner")
    graph.add_edge("planner", "inject_step")
    graph.add_edge("inject_step", "model")

    # Cùng 1 instance middleware dùng cho nhánh `react` — approval gate không có 2 nguồn sự thật
    # (ADR-0021 mục 3). `after_model` là 1 hàm thuần `(state, runtime)`, đăng ký thẳng làm node —
    # LangGraph tự inject `Runtime` theo tên tham số, không cần gọi `get_runtime()` tay.
    middleware_list = _human_in_the_loop_middleware(tools)
    route_source = "model"
    if middleware_list:
        graph.add_node("approval", middleware_list[0].after_model)
        graph.add_edge("model", "approval")
        route_source = "approval"

    if all_tools:
        graph.add_conditional_edges(
            route_source, _route_after_model, {"tools": "tools", "step_advance": "step_advance"}
        )
        graph.add_edge("tools", "model")
    else:
        graph.add_edge(route_source, "step_advance")

    graph.add_conditional_edges(
        "step_advance",
        _route_after_step_advance,
        {"inject_step": "inject_step", "synthesize": "synthesize"},
    )
    graph.add_edge("synthesize", END)

    return graph.compile(checkpointer=get_checkpointer())


async def build_agent_executor(
    *,
    system_prompt: str,
    model: ModelConfig,
    sub_agents: list[SubAgentSpec],
    tools: list[ToolSpec],
    knowledge_bases: list[KnowledgeBaseSpec],
    session: AsyncSession,
    citation_sources: list[dict] | None = None,
    execution_strategy: ExecutionStrategy = "react",
) -> CompiledStateGraph:
    """Graph cho 1 turn — orchestrator có thêm tool gọi sub-agent (ADR-0006) + tool thật gán trực
    tiếp cho agent top-level (`tools`, ADR-0013) + tool RAG tự động cho KB đã gán
    (`knowledge_bases`, docs/features/knowledge-base-chat-wiring.md). `session` dùng để tra
    credential provider (ADR-0010) khi build chat model chính + mọi sub-agent lồng bên dưới.
    `checkpointer` (ADR-0014) luôn gắn — rẻ, không ảnh hưởng turn không có tool cần duyệt; chỉ tool
    trong `TOOLS_REQUIRING_APPROVAL` mới thực sự pause.

    `citation_sources` (docs/features/kb-citation.md) — list dùng chung cho cả turn, caller
    (`LangGraphAgentRuntime.run_streaming`) tạo mới mỗi turn rồi đọc lại sau khi turn xong để trả
    cho FE. `None` (mặc định) = không track/bọc tag citation, xem `_build_kb_search_tool`.

    `execution_strategy` (ADR-0021) — "react" (mặc định, giữ nguyên `create_agent` như trước) hoặc
    "plan_execute" (rẽ sang `build_plan_execute_executor`, 1 `StateGraph` tự build riêng). Chỉ có ý
    nghĩa cho turn top-level — sub-agent (`run_sub_agent`) không nhận tham số này, luôn `react`."""
    if execution_strategy == "plan_execute":
        return await build_plan_execute_executor(
            system_prompt=system_prompt,
            model=model,
            sub_agents=sub_agents,
            tools=tools,
            knowledge_bases=knowledge_bases,
            session=session,
            citation_sources=citation_sources,
        )

    chat_model = await build_chat_model(
        provider=model.provider, model_id=model.model_id, base_url=model.base_url, session=session
    )
    sub_agent_tools = [_build_sub_agent_tool(sa, session=session) for sa in sub_agents]
    kb_tools = [
        _build_kb_search_tool(kb, session=session, sources=citation_sources)
        for kb in knowledge_bases
    ]
    all_tools = [*(await build_tools(tools, session=session)), *sub_agent_tools, *kb_tools]
    return create_agent(
        chat_model,
        tools=all_tools,
        system_prompt=system_prompt,
        checkpointer=get_checkpointer(),
        middleware=_human_in_the_loop_middleware(tools),
    )
