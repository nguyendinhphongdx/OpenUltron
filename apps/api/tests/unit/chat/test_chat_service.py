from types import SimpleNamespace

import pytest

import app.modules.chat.service as chat_service_module
from app.core.provider_adapter import ProviderConfigError
from app.modules.chat.graph import ModelConfig
from app.modules.chat.service import ChatContext, ChatService
from app.modules.conversation.message.schemas import MessageCreate


class FakeMessage:
    """Chỉ cần đủ field `_to_langchain` đọc (role/content) — không phải ORM `Message` thật
    (03-testing.md — unit test thuần, không cần DB)."""

    def __init__(self, role: str, content: str) -> None:
        self.role = role
        self.content = content


class FakeMessageService:
    def __init__(self) -> None:
        self.history: list[FakeMessage] = []
        self.appended: list[MessageCreate] = []
        self._next_id = 1

    async def list_all(self, conversation_id: int) -> list[FakeMessage]:
        return self.history

    async def append(self, conversation_id: int, input: MessageCreate):
        self.appended.append(input)
        row = SimpleNamespace(id=self._next_id, seq=self._next_id, content=input.content)
        self._next_id += 1
        self.history.append(FakeMessage(input.role, input.content))
        return row


class FakeToolService:
    """Chỉ cần `list_for_agent` — `resolve_context` bị monkeypatch qua `fake_resolve_context`
    trong `_make_service`, nhưng `ChatService.__init__` vẫn cần 1 giá trị hợp lệ cho tham số này."""

    async def list_for_agent(self, agent_id: int) -> list:
        return []


class FakeKbService:
    """Cùng lý do `FakeToolService` — `ChatService.__init__` cần 1 giá trị hợp lệ, thực tế không
    được gọi vì `resolve_context` bị monkeypatch."""

    async def list_for_agent(self, agent_id: int) -> list:
        return []


class FakeState:
    def __init__(self, *, next_nodes: tuple = (), interrupt_value: dict | None = None) -> None:
        self.next = next_nodes
        self.tasks = (
            [SimpleNamespace(interrupts=[SimpleNamespace(value=interrupt_value)])]
            if interrupt_value is not None
            else []
        )


class FakeExecutor:
    def __init__(self, events: list[dict], *, state: FakeState | None = None) -> None:
        self._events = events
        self._state = state or FakeState()

    async def astream_events(self, inputs: object, config: dict, version: str):
        for event in self._events:
            yield event

    async def aget_state(self, config: dict) -> FakeState:
        return self._state


def _make_service(message_service: FakeMessageService) -> ChatService:
    service = ChatService(
        conversation_service=None,  # type: ignore[arg-type]
        agent_service=None,  # type: ignore[arg-type]
        model_service=None,  # type: ignore[arg-type]
        settings_service=None,  # type: ignore[arg-type]
        message_service=message_service,
        tool_service=FakeToolService(),  # type: ignore[arg-type]
        kb_service=FakeKbService(),  # type: ignore[arg-type]
        session=None,  # type: ignore[arg-type]
    )

    async def fake_resolve_context(conversation_id: int) -> ChatContext:
        return ChatContext(
            system_prompt="system prompt",
            model=ModelConfig(provider="ollama", model_id="test-model"),
            sub_agents=[],
            tools=[],
            knowledge_bases=[],
        )

    service.resolve_context = fake_resolve_context  # type: ignore[method-assign]
    return service


@pytest.mark.asyncio
async def test_send_streams_delta_and_tool_events_in_order(monkeypatch: pytest.MonkeyPatch) -> None:
    events = [
        {"event": "on_chain_start", "data": {}},  # noise — phải bị bỏ qua, không forward
        {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content="Hello")}},
        {"event": "on_tool_start", "name": "research-agent", "data": {}},
        {"event": "on_tool_end", "name": "research-agent", "data": {}},
        {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content=" world")}},
    ]

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor(events)

    monkeypatch.setattr(chat_service_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)

    received = [event async for event in service.send(1, "hi")]

    assert received == [
        {"type": "delta", "text": "Hello"},
        {"type": "tool_call_start", "name": "research-agent"},
        {"type": "tool_call_end", "name": "research-agent"},
        {"type": "delta", "text": " world"},
        {"type": "done", "message_id": 2, "seq": 2},
    ]
    assert [m.role for m in message_service.appended] == ["user", "assistant"]
    assert message_service.appended[1].content == "Hello world"


@pytest.mark.asyncio
async def test_send_yields_error_event_on_provider_config_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        raise ProviderConfigError("Chưa có credential Gemini — thêm qua PUT /credentials/gemini")

    monkeypatch.setattr(chat_service_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)

    received = [event async for event in service.send(1, "hi")]

    assert received == [
        {"type": "error", "message": "Chưa có credential Gemini — thêm qua PUT /credentials/gemini"}
    ]
    # User message vẫn persist (flush trước khi build executor) — không có assistant message.
    assert [m.role for m in message_service.appended] == ["user"]


@pytest.mark.asyncio
async def test_send_yields_approval_required_when_graph_pauses(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Approval gate (ADR-0014) — `state.next` không rỗng nghĩa là graph pause chờ duyệt (xác
    nhận qua live-test thật: `astream_events` không emit event tường minh cho việc này)."""
    paused_state = FakeState(
        next_nodes=("HumanInTheLoopMiddleware.after_model",),
        interrupt_value={
            "action_requests": [{"name": "approval-test-echo", "args": {"action": "rm -rf"}}]
        },
    )

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor([], state=paused_state)

    monkeypatch.setattr(chat_service_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)

    received = [event async for event in service.send(1, "chạy tool nguy hiểm")]

    assert received == [
        {
            "type": "approval_required",
            "tool_name": "approval-test-echo",
            "arguments": {"action": "rm -rf"},
        }
    ]
    # Chưa có assistant message — turn chưa hoàn chỉnh, chỉ user message persist.
    assert [m.role for m in message_service.appended] == ["user"]


@pytest.mark.asyncio
async def test_approve_resumes_and_persists_assistant_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    events = [
        {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content="Đã xong")}}
    ]

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor(events)

    monkeypatch.setattr(chat_service_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)

    received = [event async for event in service.approve(1, "approve")]

    assert received == [
        {"type": "delta", "text": "Đã xong"},
        {"type": "done", "message_id": 1, "seq": 1},
    ]
    # approve() không tự persist user message mới (không phải turn mới) — chỉ assistant.
    assert [m.role for m in message_service.appended] == ["assistant"]
