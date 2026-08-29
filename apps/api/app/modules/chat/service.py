from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.types import Command
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.provider_adapter import ProviderConfigError
from app.modules.agent.schemas import AgentRead
from app.modules.agent.service import AgentService
from app.modules.chat.graph import (
    MAX_DELEGATION_DEPTH,
    KnowledgeBaseSpec,
    ModelConfig,
    SubAgentSpec,
    build_agent_executor,
)
from app.modules.chat.schemas import AgUiRunRequest
from app.modules.conversation.message.schemas import MessageCreate
from app.modules.conversation.message.service import MessageService
from app.modules.conversation.models import Message
from app.modules.conversation.service import ConversationService
from app.modules.knowledge_base.schemas import KnowledgeBaseRead
from app.modules.knowledge_base.service import KnowledgeBaseService
from app.modules.model.models import Model
from app.modules.model.service import ModelService
from app.modules.settings.service import SettingsService
from app.modules.tool.builder import ToolSpec
from app.modules.tool.schemas import ToolRead
from app.modules.tool.service import ToolService

DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant."


def _bootstrap_model() -> ModelConfig:
    """Fallback cuối cùng khi chưa có Model nào trong DB và AppSettings.default_model_id cũng
    trống (bootstrap an toàn — không chặn chat lần đầu chỉ vì chưa tạo Model resource). Đọc
    `settings.ollama_model`/`settings.ollama_base_url` — KHÔNG hardcode tên model (bug đã xảy ra
    thật: hardcode "qwen3.5:4b" trong khi `.env`/Ollama máy thật lại có model khác đã pull, gây
    502 "Model không phản hồi được" dù Ollama đang chạy tốt)."""
    return ModelConfig(
        provider="ollama", model_id=settings.ollama_model, base_url=settings.ollama_base_url
    )


def _to_config(row: Model) -> ModelConfig:
    return ModelConfig(provider=row.provider, model_id=row.model_id, base_url=row.base_url)


def _to_tool_spec(row: ToolRead) -> ToolSpec:
    return ToolSpec(
        id=row.id,
        slug=row.slug,
        name=row.name,
        description=row.description,
        kind=row.kind,
        config=row.config,
    )


def _to_kb_spec(row: KnowledgeBaseRead) -> KnowledgeBaseSpec:
    return KnowledgeBaseSpec(id=row.id, slug=row.slug, name=row.name, description=row.description)


def _extract_text(content: str | list) -> str:
    """`AIMessageChunk.content` không phải luôn là `str` — model có "thinking"/tool-signature
    (Gemini 2.5+, ADR-0009) trả content dạng list content-block (`[{"type": "text", "text":
    "..."}, ...]`, có thể kèm block `thinking`/`extras.signature` không phải text hiển thị). Chỉ
    nối các block `type == "text"`; không có block text nào (vd chunk chỉ mang metadata, list
    rỗng) → trả rỗng — KHÔNG fallback `str(content)` như trước: đó chính là bug thật phát hiện qua
    live-test streaming (2026-08-24) — chunk `content=[]` bị `str([])` thành literal `"[]"` lẫn
    vào giữa text stream (khác lúc dùng cho message hoàn chỉnh trước đây, mỗi chunk streaming rất
    hay có content rỗng/không-text nên fallback stringify sai hoàn toàn ở đây)."""
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
    `astream_events` KHÔNG emit event tường minh cho việc này (xác nhận qua live-test thật,
    2026-08-24: stream chỉ kết thúc lặng lẽ, không có event `__interrupt__` nào chảy qua
    `astream_events`). Phải tự `aget_state()` sau khi stream xong để biết graph có pause không —
    payload nằm ở `state.tasks[*].interrupts[*].value["action_requests"]`. Chỉ lấy request đầu
    tiên (bản đầu chưa cần xử lý nhiều tool cần duyệt cùng lúc)."""
    for task in state.tasks:
        for interrupt in task.interrupts:
            value = interrupt.value
            requests = value.get("action_requests") if isinstance(value, dict) else None
            if requests:
                return requests[0]
    return None


def _to_langchain(row: Message) -> BaseMessage | None:
    if row.role == "system":
        return SystemMessage(content=row.content)
    if row.role == "user":
        return HumanMessage(content=row.content)
    if row.role == "assistant":
        return AIMessage(content=row.content)
    return None  # role == "tool" — chưa nạp vào history model, graph tool state riêng


@dataclass
class ChatContext:
    """Kết quả `ChatService.resolve_context()` — dataclass (field có tên), KHÔNG phải tuple trần.
    Lý do đổi (2026-08-24): tuple trần từng gây bug thật ở voice module (unpack sai số lượng khi
    thêm `tool_specs` sau, lỗi âm thầm không ai báo lúc build/lint) — dataclass buộc gọi qua tên
    field, thêm field mới không làm hỏng ngầm call site cũ."""

    system_prompt: str
    model: ModelConfig
    sub_agents: list[SubAgentSpec]
    tools: list[ToolSpec]
    knowledge_bases: list[KnowledgeBaseSpec]


class ChatService:
    """Chạy 1 turn: lưu user message, resolve agent+model (ADR-0006/0007), gọi graph, lưu."""

    def __init__(
        self,
        conversation_service: ConversationService,
        agent_service: AgentService,
        model_service: ModelService,
        settings_service: SettingsService,
        message_service: MessageService,
        tool_service: ToolService,
        kb_service: KnowledgeBaseService,
        session: AsyncSession,
    ) -> None:
        self.conversation_service = conversation_service
        self.agent_service = agent_service
        self.model_service = model_service
        self.settings_service = settings_service
        self.message_service = message_service
        self.tool_service = tool_service
        self.kb_service = kb_service
        self.session = session  # dùng để tra credential provider (ADR-0010) khi build chat model

    async def _resolve_sub_agent_spec(self, agent: AgentRead, *, depth: int = 0) -> SubAgentSpec:
        model_row = await self.model_service.get_or_404(agent.model_id)
        sub_agents: list[SubAgentSpec] = []
        # Đa tầng (ADR-0006 mở rộng): 1 sub-agent có is_orchestrator=true vẫn được tiếp tục gọi
        # sub-agent riêng của nó — chặn ở MAX_DELEGATION_DEPTH phòng cycle lọt qua check tạo cạnh.
        if agent.is_orchestrator and depth < MAX_DELEGATION_DEPTH:
            sub_agents = [
                await self._resolve_sub_agent_spec(sa, depth=depth + 1)
                for sa in await self.agent_service.list_sub_agents(agent.id)
            ]
        tool_reads = await self.tool_service.list_for_agent(agent.id)
        kb_reads = await self.kb_service.list_for_agent(agent.id)
        return SubAgentSpec(
            slug=agent.slug,
            description=agent.description,
            system_prompt=agent.system_prompt,
            model=_to_config(model_row),
            sub_agents=sub_agents,
            tools=[_to_tool_spec(t) for t in tool_reads],
            knowledge_bases=[_to_kb_spec(kb) for kb in kb_reads],
        )

    async def _resolve_default_model(self) -> ModelConfig:
        app_settings = await self.settings_service.get()
        if app_settings.default_model_id is not None:
            model_row = await self.model_service.find(app_settings.default_model_id)
            if model_row is not None:
                return _to_config(model_row)
        return _bootstrap_model()

    async def resolve_context(self, conversation_id: int) -> ChatContext:
        """Context đầy đủ cho 1 conversation — dùng lại được ở bất kỳ transport nào cần chạy agent
        cho conversation đó (chat text ở `send()`, hoặc voice module — ADR-0009 — không tự resolve
        lại agent/model riêng cho voice). `tools`/`knowledge_bases` là tool/KB gán trực tiếp cho
        agent top-level (ADR-0013/docs/features/knowledge-base-chat-wiring.md) — khác
        `sub_agents[*].tools`/`sub_agents[*].knowledge_bases`."""
        conversation = await self.conversation_service.get_or_404(conversation_id)

        sub_agent_specs: list[SubAgentSpec] = []
        tool_specs: list[ToolSpec] = []
        kb_specs: list[KnowledgeBaseSpec] = []
        if conversation.agent_id is not None:
            # ON DELETE SET NULL không xoá conversation nên agent chắc chắn còn tồn tại;
            # vẫn dùng get_or_404 (qua AgentService) thay vì assert cho phòng thủ chắc chắn hơn.
            agent = await self.agent_service.get_or_404(conversation.agent_id)
            model_row = await self.model_service.get_or_404(agent.model_id)
            system_prompt, model = agent.system_prompt, _to_config(model_row)
            tool_reads = await self.tool_service.list_for_agent(agent.id)
            tool_specs = [_to_tool_spec(t) for t in tool_reads]
            kb_reads = await self.kb_service.list_for_agent(agent.id)
            kb_specs = [_to_kb_spec(kb) for kb in kb_reads]
            if agent.is_orchestrator:
                sub_agent_specs = [
                    await self._resolve_sub_agent_spec(sa)
                    for sa in await self.agent_service.list_sub_agents(agent.id)
                ]
        else:
            system_prompt, model = DEFAULT_SYSTEM_PROMPT, await self._resolve_default_model()
        return ChatContext(
            system_prompt=system_prompt,
            model=model,
            sub_agents=sub_agent_specs,
            tools=tool_specs,
            knowledge_bases=kb_specs,
        )

    async def _run_turn(
        self, conversation_id: int, executor: Any, config: dict[str, Any], input_data: Any
    ) -> AsyncIterator[dict]:
        """Chạy graph tới khi xong turn HOẶC pause chờ duyệt (ADR-0014) — dùng chung cho `send()`
        (turn mới) và `approve()` (resume turn đang chờ). Không persist gì nếu pause (chưa có gì
        hoàn chỉnh để lưu — user message đã persist trước đó ở caller)."""
        accumulated: list[str] = []
        async for event in executor.astream_events(input_data, config=config, version="v2"):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                text = _extract_text(event["data"]["chunk"].content)
                if text:
                    accumulated.append(text)
                    yield {"type": "delta", "text": text}
            elif kind == "on_tool_start":
                # Áp dụng cho tool "gọi sub-agent" (sub-agent tự chạy `ainvoke()` riêng, không
                # lồng vào astream_events này — chỉ thấy lúc bắt đầu/kết thúc) và tool `kind=http`
                # (ADR-0013, chạy trực tiếp trong graph này, bản chất chỉ 1 lần gọi/trả kết quả).
                yield {"type": "tool_call_start", "name": event["name"]}
            elif kind == "on_tool_end":
                yield {"type": "tool_call_end", "name": event["name"]}

        state = await executor.aget_state(config)
        if state.next:
            # Pause chờ duyệt (HumanInTheLoopMiddleware, ADR-0014) — KHÔNG persist assistant
            # message (turn chưa hoàn chỉnh, chỉ có tool call chưa chạy).
            request = _first_action_request(state)
            yield {
                "type": "approval_required",
                "tool_name": request["name"] if request else "unknown",
                "arguments": request.get("args", {}) if request else {},
            }
            return

        assistant_message = await self.message_service.append(
            conversation_id, MessageCreate(role="assistant", content="".join(accumulated))
        )
        yield {"type": "done", "message_id": assistant_message.id, "seq": assistant_message.seq}

    async def send(self, conversation_id: int, user_text: str) -> AsyncIterator[dict]:
        """Stream 1 turn qua SSE (chat-streaming, docs/features/chat-streaming.md) — yield dict,
        router format thành SSE frame (`data: <json>\\n\\n`). KHÔNG raise HTTPException nữa: với
        response dạng stream, status 200 đã gửi cho client trước khi ta có thể biết lỗi (FastAPI
        gửi `http.response.start` trước khi lấy chunk đầu từ body iterator) — mọi lỗi phải là 1
        event `error` trong stream, không phải HTTP status khác."""
        ctx = await self.resolve_context(conversation_id)

        history_rows = await self.message_service.list_all(conversation_id)
        history = [m for row in history_rows if (m := _to_langchain(row)) is not None]

        await self.message_service.append(
            conversation_id, MessageCreate(role="user", content=user_text)
        )

        config = {"configurable": {"thread_id": str(conversation_id)}}
        try:
            executor = await build_agent_executor(
                system_prompt=ctx.system_prompt,
                model=ctx.model,
                sub_agents=ctx.sub_agents,
                tools=ctx.tools,
                knowledge_bases=ctx.knowledge_bases,
                session=self.session,
            )
            async for event in self._run_turn(
                conversation_id,
                executor,
                config,
                {"messages": [*history, HumanMessage(content=user_text)]},
            ):
                yield event
        except ProviderConfigError as exc:
            # Lỗi cấu hình (thiếu credential/base_url) — user có thể tự sửa ngay (thêm API key ở
            # Settings). User message vẫn đã persist ở trên (flush, commit khi request xong qua
            # get_session) — không có assistant message vì chưa sinh được gì.
            yield {"type": "error", "message": str(exc)}
        except Exception as exc:
            # Không catch cụ thể theo provider — lỗi có thể đến từ bất kỳ LangChain chat model nào
            # (Ollama/Gemini/OpenAI).
            yield {"type": "error", "message": f"Model không phản hồi được: {exc}"}

    async def approve(self, conversation_id: int, decision: str) -> AsyncIterator[dict]:
        """Resume 1 turn đang chờ duyệt (approval gate, ADR-0014) — `decision` là
        `"approve"`/`"reject"`. Build lại executor từ context hiện tại (giống `send()`) — graph là
        stateless, state thật nằm ở checkpointer (`thread_id` = `conversation_id`), executor mới
        build lại vẫn resume đúng miễn tools/model không đổi giữa lúc pause và lúc duyệt."""
        ctx = await self.resolve_context(conversation_id)
        config = {"configurable": {"thread_id": str(conversation_id)}}
        try:
            executor = await build_agent_executor(
                system_prompt=ctx.system_prompt,
                model=ctx.model,
                sub_agents=ctx.sub_agents,
                tools=ctx.tools,
                knowledge_bases=ctx.knowledge_bases,
                session=self.session,
            )
            resume_input = Command(resume={"decisions": [{"type": decision}]})
            async for event in self._run_turn(conversation_id, executor, config, resume_input):
                yield event
        except ProviderConfigError as exc:
            yield {"type": "error", "message": str(exc)}
        except Exception as exc:
            yield {"type": "error", "message": f"Model không phản hồi được: {exc}"}

    async def send_agui(
        self, conversation_id: int, request: AgUiRunRequest
    ) -> AsyncIterator[dict[str, Any]]:
        """Adapter AG-UI (ADR-0019) — map `ChatService.send/approve` events tự chế hiện tại sang
        AG-UI events để `@ag-ui/client` + `assistant-ui` đọc được. Đây là compatibility layer ở
        boundary, chưa đổi execution core bên trong."""
        run_id = request.runId
        thread_id = str(conversation_id)
        message_id = f"msg-{uuid4()}"
        text_started = False
        active_tool_call_ids: dict[str, str] = {}

        yield {"type": "RUN_STARTED", "threadId": thread_id, "runId": run_id}

        if request.resume:
            decision = _decision_from_agui_resume(request.resume)
            source = self.approve(conversation_id, decision)
        else:
            user_text = _last_user_text_from_agui_messages(request.messages)
            if user_text is None:
                yield {
                    "type": "RUN_ERROR",
                    "message": "AG-UI request thiếu message user cuối cùng.",
                    "code": "chat.missing_user_message",
                }
                return
            source = self.send(conversation_id, user_text)

        async for event in source:
            event_type = event.get("type")
            if event_type == "delta":
                if not text_started:
                    yield {
                        "type": "TEXT_MESSAGE_START",
                        "messageId": message_id,
                        "role": "assistant",
                    }
                    text_started = True
                yield {
                    "type": "TEXT_MESSAGE_CONTENT",
                    "messageId": message_id,
                    "delta": event.get("text", ""),
                }
            elif event_type == "tool_call_start":
                if not text_started:
                    yield {
                        "type": "TEXT_MESSAGE_START",
                        "messageId": message_id,
                        "role": "assistant",
                    }
                    text_started = True
                tool_name = str(event.get("name", "unknown"))
                tool_call_id = f"tool-{uuid4()}"
                active_tool_call_ids[tool_name] = tool_call_id
                yield {
                    "type": "TOOL_CALL_START",
                    "toolCallId": tool_call_id,
                    "toolCallName": tool_name,
                    "parentMessageId": message_id,
                }
            elif event_type == "tool_call_end":
                tool_name = str(event.get("name", "unknown"))
                tool_call_id = active_tool_call_ids.pop(tool_name, f"tool-{uuid4()}")
                yield {"type": "TOOL_CALL_END", "toolCallId": tool_call_id}
            elif event_type == "approval_required":
                if not text_started:
                    yield {
                        "type": "TEXT_MESSAGE_START",
                        "messageId": message_id,
                        "role": "assistant",
                    }
                    text_started = True
                tool_call_id = f"tool-{uuid4()}"
                interrupt_id = f"interrupt-{uuid4()}"
                tool_name = str(event.get("tool_name", "unknown"))
                arguments = event.get("arguments", {})
                yield {
                    "type": "TOOL_CALL_START",
                    "toolCallId": tool_call_id,
                    "toolCallName": tool_name,
                    "parentMessageId": message_id,
                }
                yield {
                    "type": "TOOL_CALL_ARGS",
                    "toolCallId": tool_call_id,
                    "delta": _json_dumps_compact(arguments),
                }
                yield {"type": "TOOL_CALL_END", "toolCallId": tool_call_id}
                yield {"type": "TEXT_MESSAGE_END", "messageId": message_id}
                yield {
                    "type": "RUN_FINISHED",
                    "threadId": thread_id,
                    "runId": run_id,
                    "outcome": {
                        "type": "interrupt",
                        "interrupts": [
                            {
                                "id": interrupt_id,
                                "reason": "tool_call",
                                "message": f"Cần duyệt trước khi chạy tool {tool_name}",
                                "toolCallId": tool_call_id,
                                "metadata": {"toolName": tool_name, "arguments": arguments},
                            }
                        ],
                    },
                }
                return
            elif event_type == "error":
                yield {
                    "type": "RUN_ERROR",
                    "message": str(event.get("message", "Model không phản hồi được.")),
                    "code": "chat.run_error",
                }
                return
            elif event_type == "done":
                if text_started:
                    yield {"type": "TEXT_MESSAGE_END", "messageId": message_id}
                yield {
                    "type": "RUN_FINISHED",
                    "threadId": thread_id,
                    "runId": run_id,
                    "outcome": {"type": "success"},
                    "result": {
                        "messageId": event.get("message_id"),
                        "seq": event.get("seq"),
                    },
                }
                return

        yield {
            "type": "RUN_ERROR",
            "message": "Agent stream kết thúc mà không có done/interrupt.",
            "code": "chat.stream_incomplete",
        }


def _last_user_text_from_agui_messages(messages: list[dict[str, Any]]) -> str | None:
    for message in reversed(messages):
        if message.get("role") != "user":
            continue
        content = message.get("content")
        if isinstance(content, str):
            text = content.strip()
            return text or None
        if isinstance(content, list):
            parts = [
                part.get("text", "")
                for part in content
                if isinstance(part, dict) and part.get("type") == "text"
            ]
            text = "\n".join(p for p in parts if p).strip()
            return text or None
    return None


def _decision_from_agui_resume(resume: list[dict[str, Any]]) -> str:
    for entry in resume:
        if entry.get("status") == "cancelled":
            return "reject"
        payload = entry.get("payload")
        if isinstance(payload, dict) and payload.get("approved") is False:
            return "reject"
    return "approve"


def _json_dumps_compact(value: Any) -> str:
    import json

    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
