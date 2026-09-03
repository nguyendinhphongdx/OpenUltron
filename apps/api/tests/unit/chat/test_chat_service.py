from types import SimpleNamespace

import pytest

import app.core.agent_runtime as agent_runtime_module
from app.core.provider_adapter import ProviderConfigError
from app.modules.chat.graph import ModelConfig
from app.modules.chat.schemas import AgUiRunRequest
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


class FakeToolCallService:
    """Ghi lại đúng thứ tự `create`/`complete` được gọi — đủ để test
    `ChatService._persist_tool_calls` gọi đúng dữ liệu, không cần DB thật (03-testing.md)."""

    def __init__(self) -> None:
        self.created: list[tuple[int, object]] = []
        self.completed: list[tuple[int, object]] = []
        self._next_id = 1

    async def create(self, message_id: int, input: object):
        self.created.append((message_id, input))
        row_id = self._next_id
        self._next_id += 1
        return SimpleNamespace(id=row_id)

    async def complete(self, tool_call_id: int, input: object):
        self.completed.append((tool_call_id, input))
        return SimpleNamespace(id=tool_call_id)


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


def _make_service(
    message_service: FakeMessageService, tool_call_service: FakeToolCallService | None = None
) -> ChatService:
    service = ChatService(
        conversation_service=None,  # type: ignore[arg-type]
        agent_service=None,  # type: ignore[arg-type]
        model_service=None,  # type: ignore[arg-type]
        settings_service=None,  # type: ignore[arg-type]
        message_service=message_service,
        tool_service=FakeToolService(),  # type: ignore[arg-type]
        kb_service=FakeKbService(),  # type: ignore[arg-type]
        tool_call_service=tool_call_service or FakeToolCallService(),  # type: ignore[arg-type]
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
        {
            "event": "on_tool_start",
            "name": "research-agent",
            "run_id": "run-1",
            "data": {"input": {"query": "abc"}},
        },
        {
            "event": "on_tool_end",
            "name": "research-agent",
            "run_id": "run-1",
            "data": {"output": "result-1"},
        },
        {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content=" world")}},
    ]

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor(events)

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)

    received = [event async for event in service.send(1, "hi")]

    assert received == [
        {"type": "delta", "text": "Hello"},
        {
            "type": "tool_call_start",
            "run_id": "run-1",
            "name": "research-agent",
            "input": {"query": "abc"},
        },
        {
            "type": "tool_call_end",
            "run_id": "run-1",
            "name": "research-agent",
            "output": "result-1",
            "is_error": False,
        },
        {"type": "delta", "text": " world"},
        {"type": "done", "message_id": 2, "seq": 2},
    ]
    assert [m.role for m in message_service.appended] == ["user", "assistant"]
    assert message_service.appended[1].content == "Hello world"


@pytest.mark.asyncio
async def test_send_persists_tool_call_to_tool_calls_table_on_done(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Gap có ghi trong roadmap ("Ghi lại tool-call của orchestrator... chưa persist ra bảng đã
    thiết kế") — `tool_calls` (module `conversation/tool_call/`) có sẵn model/schema/service từ
    trước nhưng chưa ai gọi. Giờ `ChatService._persist_tool_calls` gọi `create`+`complete` khi turn
    xong (`done`), dùng `message_id` của assistant message vừa persist."""
    events = [
        {
            "event": "on_tool_start",
            "name": "weather-lookup",
            "run_id": "run-1",
            "data": {"input": {"city": "Hà Nội"}},
        },
        {
            "event": "on_tool_end",
            "name": "weather-lookup",
            "run_id": "run-1",
            "data": {"output": "28 độ C, nắng"},
        },
        {
            "event": "on_chat_model_stream",
            "data": {"chunk": SimpleNamespace(content="Hôm nay 28 độ")},
        },
    ]

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor(events)

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    tool_call_service = FakeToolCallService()
    service = _make_service(message_service, tool_call_service)

    received = [event async for event in service.send(1, "thời tiết Hà Nội thế nào")]

    done_event = received[-1]
    assert done_event["type"] == "done"
    assistant_message_id = done_event["message_id"]

    assert len(tool_call_service.created) == 1
    created_message_id, create_input = tool_call_service.created[0]
    assert created_message_id == assistant_message_id
    assert create_input.tool_name == "weather-lookup"
    assert create_input.arguments == {"city": "Hà Nội"}

    assert len(tool_call_service.completed) == 1
    _, complete_input = tool_call_service.completed[0]
    assert complete_input.status == "success"
    assert complete_input.result == {"output": "28 độ C, nắng"}
    assert complete_input.error is None


@pytest.mark.asyncio
async def test_send_persists_tool_call_as_error_when_tool_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`on_tool_error` (LangChain) trước đây không được bắt ở `_stream_turn` — tool raise exception
    thì không bao giờ có `tool_call_end` nào cả, cả UI trace lẫn bảng `tool_calls` đều không thấy
    call đó (trông như agent treo ở tool đó). Giờ bắt riêng, đánh dấu `status="error"`."""
    events = [
        {
            "event": "on_tool_start",
            "name": "run-command",
            "run_id": "run-2",
            "data": {"input": {"command": "ls /khong-ton-tai"}},
        },
        {
            "event": "on_tool_error",
            "name": "run-command",
            "run_id": "run-2",
            "data": {"error": RuntimeError("No such file or directory")},
        },
        {
            "event": "on_chat_model_stream",
            "data": {"chunk": SimpleNamespace(content="Không chạy được lệnh đó.")},
        },
    ]

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor(events)

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    tool_call_service = FakeToolCallService()
    service = _make_service(message_service, tool_call_service)

    received = [event async for event in service.send(1, "chạy ls thư mục lạ")]

    tool_call_end = next(e for e in received if e["type"] == "tool_call_end")
    assert tool_call_end["is_error"] is True
    assert "No such file or directory" in tool_call_end["output"]

    assert len(tool_call_service.completed) == 1
    _, complete_input = tool_call_service.completed[0]
    assert complete_input.status == "error"
    assert complete_input.result is None
    assert "No such file or directory" in complete_input.error


@pytest.mark.asyncio
async def test_send_yields_error_event_on_provider_config_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        raise ProviderConfigError("Chưa có credential Gemini — thêm qua PUT /credentials/gemini")

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

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

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

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

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)

    received = [event async for event in service.approve(1, "approve")]

    assert received == [
        {"type": "delta", "text": "Đã xong"},
        {"type": "done", "message_id": 1, "seq": 1},
    ]
    # approve() không tự persist user message mới (không phải turn mới) — chỉ assistant.
    assert [m.role for m in message_service.appended] == ["assistant"]


@pytest.mark.asyncio
async def test_send_agui_maps_stream_to_ag_ui_events(monkeypatch: pytest.MonkeyPatch) -> None:
    events = [
        {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content="Xin")}},
        {
            "event": "on_tool_start",
            "name": "research-agent",
            "run_id": "run-1",
            "data": {"input": {"query": "abc"}},
        },
        {
            "event": "on_tool_end",
            "name": "research-agent",
            "run_id": "run-1",
            "data": {"output": "result-1"},
        },
        {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content=" chào")}},
    ]

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor(events)

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)
    request = AgUiRunRequest(
        threadId="1",
        runId="run-1",
        messages=[{"id": "user-1", "role": "user", "content": "hi"}],
        state={},
        tools=[],
        context=[],
        forwardedProps={},
    )

    received = [event async for event in service.send_agui(1, request)]

    assert [event["type"] for event in received] == [
        "RUN_STARTED",
        "TEXT_MESSAGE_START",
        "TEXT_MESSAGE_CONTENT",
        "TOOL_CALL_START",
        "TOOL_CALL_ARGS",
        "TOOL_CALL_RESULT",
        "TOOL_CALL_END",
        "TEXT_MESSAGE_CONTENT",
        "TEXT_MESSAGE_END",
        "RUN_FINISHED",
    ]
    assert received[0]["threadId"] == "1"
    assert received[0]["runId"] == "run-1"
    assert received[2]["delta"] == "Xin"
    assert received[3]["toolCallName"] == "research-agent"
    tool_call_id = received[3]["toolCallId"]
    assert received[4]["toolCallId"] == tool_call_id
    assert received[4]["delta"] == '{"query":"abc"}'
    assert received[5]["toolCallId"] == tool_call_id
    assert received[5]["content"] == "result-1"
    assert received[5]["messageId"] == received[1]["messageId"]
    assert received[6]["toolCallId"] == tool_call_id
    assert received[-1]["outcome"] == {"type": "success"}
    assert message_service.appended[0].content == "hi"
    assert message_service.appended[1].content == "Xin chào"


@pytest.mark.asyncio
async def test_send_agui_gives_distinct_tool_call_ids_for_repeated_tool_in_same_turn(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Bug đã fix (docs/features/agent-execution-trace.md): trước đây `toolCallId` tra theo tên
    tool (dict `active_tool_call_ids`), gọi lặp lại cùng 1 tool trong 1 turn có thể lẫn id — giờ
    dùng thẳng `run_id` (id ổn định từ LangChain) nên 2 lần gọi cùng tên tool vẫn tách biệt."""
    events = [
        {
            "event": "on_tool_start",
            "name": "search-knowledge-base-kb",
            "run_id": "run-1",
            "data": {"input": {"query": "câu hỏi 1"}},
        },
        {
            "event": "on_tool_end",
            "name": "search-knowledge-base-kb",
            "run_id": "run-1",
            "data": {"output": "result-1"},
        },
        {
            "event": "on_tool_start",
            "name": "search-knowledge-base-kb",
            "run_id": "run-2",
            "data": {"input": {"query": "câu hỏi 2"}},
        },
        {
            "event": "on_tool_end",
            "name": "search-knowledge-base-kb",
            "run_id": "run-2",
            "data": {"output": "result-2"},
        },
    ]

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor(events)

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

    service = _make_service(FakeMessageService())
    request = AgUiRunRequest(
        threadId="1",
        runId="run-x",
        messages=[{"id": "user-1", "role": "user", "content": "hi"}],
        state={},
        tools=[],
        context=[],
        forwardedProps={},
    )

    received = [event async for event in service.send_agui(1, request)]

    result_events = [e for e in received if e["type"] == "TOOL_CALL_RESULT"]
    assert [e["content"] for e in result_events] == ["result-1", "result-2"]
    assert result_events[0]["toolCallId"] != result_events[1]["toolCallId"]


@pytest.mark.asyncio
async def test_send_agui_maps_approval_to_interrupt(monkeypatch: pytest.MonkeyPatch) -> None:
    paused_state = FakeState(
        next_nodes=("HumanInTheLoopMiddleware.after_model",),
        interrupt_value={"action_requests": [{"name": "run-command", "args": {"command": "ls"}}]},
    )

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor([], state=paused_state)

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)
    request = AgUiRunRequest(
        threadId="1",
        runId="run-approval",
        messages=[{"id": "user-1", "role": "user", "content": "list files"}],
    )

    received = [event async for event in service.send_agui(1, request)]

    assert [event["type"] for event in received] == [
        "RUN_STARTED",
        "TEXT_MESSAGE_START",
        "TOOL_CALL_START",
        "TOOL_CALL_ARGS",
        "TOOL_CALL_END",
        "TEXT_MESSAGE_END",
        "RUN_FINISHED",
    ]
    outcome = received[-1]["outcome"]
    assert outcome["type"] == "interrupt"
    interrupt = outcome["interrupts"][0]
    assert interrupt["reason"] == "tool_call"
    assert interrupt["toolCallId"] == received[2]["toolCallId"]
    assert interrupt["metadata"] == {"toolName": "run-command", "arguments": {"command": "ls"}}


@pytest.mark.asyncio
async def test_send_agui_resume_reject_calls_approve(monkeypatch: pytest.MonkeyPatch) -> None:
    events = [
        {"event": "on_chat_model_stream", "data": {"chunk": SimpleNamespace(content="Đã từ chối")}}
    ]

    async def fake_build_agent_executor(**kwargs: object) -> FakeExecutor:
        return FakeExecutor(events)

    monkeypatch.setattr(agent_runtime_module, "build_agent_executor", fake_build_agent_executor)

    message_service = FakeMessageService()
    service = _make_service(message_service)
    request = AgUiRunRequest(
        threadId="1",
        runId="run-resume",
        messages=[],
        resume=[
            {
                "interruptId": "interrupt-1",
                "status": "resolved",
                "payload": {"approved": False},
            }
        ],
    )

    received = [event async for event in service.send_agui(1, request)]

    assert [event["type"] for event in received] == [
        "RUN_STARTED",
        "TEXT_MESSAGE_START",
        "TEXT_MESSAGE_CONTENT",
        "TEXT_MESSAGE_END",
        "RUN_FINISHED",
    ]
    assert message_service.appended[0].role == "assistant"
    assert message_service.appended[0].content == "Đã từ chối"
