"""Interface chạy 1 turn agent (ADR-0020) — `ChatService`/`voice` chỉ gọi qua đây, không biết chi
tiết LangGraph (`CompiledStateGraph`/`Command`/`astream_events`/`aget_state` không lộ ra chữ ký
public). Chỉ 1 implementation hiện tại (`LangGraphAgentRuntime`) — KHÔNG dựng registry (đúng
ngưỡng "Modular/swappable component", 01-backend-fastapi.md: chỉ trừu tượng hoá khi ≥2 cài đặt
thật)."""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Protocol

from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.types import Command
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.chat.graph import (
    KnowledgeBaseSpec,
    ModelConfig,
    SubAgentSpec,
    build_agent_executor,
    run_sub_agent,
)
from app.modules.tool.builder import ToolSpec


@dataclass
class AgentRunConfig:
    """DTO đủ để build 1 executor cho 1 turn — tách khỏi ORM (ADR-0007), dùng chung cho
    `AgentRuntime.run_streaming`."""

    system_prompt: str
    model: ModelConfig
    sub_agents: list[SubAgentSpec]
    tools: list[ToolSpec]
    knowledge_bases: list[KnowledgeBaseSpec]


class AgentRuntime(Protocol):
    """Xem ADR-0020. 2 method riêng vì 2 use case khác bản chất (không ép chung 1 shape, đúng bài
    học ADR-0013 đã bác bỏ nhồi nhiều case vào 1 shape linh hoạt)."""

    async def run_streaming(
        self,
        *,
        config: AgentRunConfig,
        thread_id: str,
        session: AsyncSession,
        history: list[BaseMessage] | None = None,
        user_text: str | None = None,
        resume_decision: str | None = None,
    ) -> AsyncIterator[dict]:
        """Chạy/resume 1 turn top-level (có checkpoint + approval gate, ADR-0014) — yield event
        `{"type": "delta"|"tool_call_start"|"tool_call_end"|"approval_required"|"done"|"error",
        ...}`. Truyền `(history, user_text)` để bắt đầu turn MỚI, HOẶC `resume_decision`
        (`"approve"`/`"reject"`) để resume turn đang chờ duyệt — đúng 1 trong 2, không cả hai.
        Event `"done"` chỉ có `{"text": <accumulated>}` — KHÔNG tự persist Message gì, caller
        (`ChatService`) tự quyết lưu gì dựa trên event nhận được."""
        ...

    async def run_sync(
        self, *, sub_agent: SubAgentSpec, task: str, session: AsyncSession, depth: int = 0
    ) -> str:
        """Chạy 1 sub-agent đồng bộ, KHÔNG checkpoint/approval gate (chủ đích — nested interrupt
        ngoài phạm vi ADR-0014; tool rủi ro cao đã bị loại khỏi `sub_agent.tools` trước khi tới đây,
        xem addendum fail-closed ở ADR-0014). Dùng cho tool "gọi sub-agent" và voice tool-call."""
        ...


def _extract_text(content: str | list) -> str:
    """`AIMessageChunk.content` không phải luôn là `str` — model có "thinking"/tool-signature
    (Gemini 2.5+, ADR-0009) trả content dạng list content-block. Chỉ nối block `type == "text"`;
    không có block text nào → trả rỗng (KHÔNG fallback `str(content)` — bug thật đã fix trước đó,
    xem lịch sử `chat/service.py` cũ)."""
    if isinstance(content, str):
        return content
    parts = [
        block["text"]
        for block in content
        if isinstance(block, dict) and block.get("type") == "text"
    ]
    return "".join(parts)


def _first_action_request(state: Any) -> dict[str, Any] | None:
    """`HumanInTheLoopMiddleware` (ADR-0014) pause graph bằng LangGraph `interrupt()` nội bộ —
    `astream_events` KHÔNG emit event tường minh cho việc này. Phải tự `aget_state()` sau khi stream
    xong để biết graph có pause không — payload nằm ở
    `state.tasks[*].interrupts[*].value["action_requests"]`. Chỉ lấy request đầu tiên."""
    for task in state.tasks:
        for interrupt in task.interrupts:
            value = interrupt.value
            requests = value.get("action_requests") if isinstance(value, dict) else None
            if requests:
                return requests[0]
    return None


async def _stream_turn(
    executor: Any, config: dict[str, Any], input_data: Any
) -> AsyncIterator[dict]:
    """Chạy graph tới khi xong turn HOẶC pause chờ duyệt (ADR-0014). KHÔNG persist gì — caller
    quyết định lưu gì dựa trên event `done`/`approval_required`."""
    accumulated: list[str] = []
    async for event in executor.astream_events(input_data, config=config, version="v2"):
        kind = event["event"]
        if kind == "on_chat_model_stream":
            text = _extract_text(event["data"]["chunk"].content)
            if text:
                accumulated.append(text)
                yield {"type": "delta", "text": text}
        elif kind == "on_tool_start":
            yield {"type": "tool_call_start", "name": event["name"]}
        elif kind == "on_tool_end":
            yield {"type": "tool_call_end", "name": event["name"]}

    state = await executor.aget_state(config)
    if state.next:
        request = _first_action_request(state)
        yield {
            "type": "approval_required",
            "tool_name": request["name"] if request else "unknown",
            "arguments": request.get("args", {}) if request else {},
        }
        return

    yield {"type": "done", "text": "".join(accumulated)}


class LangGraphAgentRuntime:
    """Implementation DUY NHẤT hiện tại (ADR-0020)."""

    async def run_streaming(
        self,
        *,
        config: AgentRunConfig,
        thread_id: str,
        session: AsyncSession,
        history: list[BaseMessage] | None = None,
        user_text: str | None = None,
        resume_decision: str | None = None,
    ) -> AsyncIterator[dict]:
        executor = await build_agent_executor(
            system_prompt=config.system_prompt,
            model=config.model,
            sub_agents=config.sub_agents,
            tools=config.tools,
            knowledge_bases=config.knowledge_bases,
            session=session,
        )
        graph_config = {"configurable": {"thread_id": thread_id}}
        input_data: Any
        if resume_decision is not None:
            input_data = Command(resume={"decisions": [{"type": resume_decision}]})
        else:
            input_data = {"messages": [*(history or []), HumanMessage(content=user_text or "")]}

        async for event in _stream_turn(executor, graph_config, input_data):
            yield event

    async def run_sync(
        self, *, sub_agent: SubAgentSpec, task: str, session: AsyncSession, depth: int = 0
    ) -> str:
        return await run_sub_agent(sub_agent, task, session=session, depth=depth)
