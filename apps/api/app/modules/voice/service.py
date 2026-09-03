import asyncio
from typing import Literal

from fastapi import WebSocket
from fastapi import status as ws_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.agent_runtime import LangGraphAgentRuntime
from app.core.logging import logger
from app.db.session import async_session_factory
from app.modules.chat.graph import KnowledgeBaseSpec, SubAgentSpec, build_kb_search_tool
from app.modules.chat.service import ChatService
from app.modules.conversation.message.deps import get_message_service
from app.modules.conversation.message.schemas import MessageCreate
from app.modules.conversation.models import Message
from app.modules.tool.builder import TOOLS_REQUIRING_APPROVAL, ToolSpec, build_tools
from app.modules.voice.contracts import VoiceHistoryTurn, VoiceToolDeclaration
from app.modules.voice.events import (
    AudioDelta,
    Interrupted,
    SessionEnding,
    ToolCallCancelled,
    ToolCallRequested,
    TranscriptDelta,
    TurnComplete,
)
from app.modules.voice.provider_adapter import get_voice_provider

VoiceState = Literal["listening", "thinking", "speaking", "using_tool"]

# ADR-0020 — voice gọi sub-agent qua AgentRuntime.run_sync thay vì `run_sub_agent()` trực tiếp.
# Không state, an toàn dùng chung 1 instance module-level (không cần registry/DI, chỉ 1
# implementation).
_agent_runtime = LangGraphAgentRuntime()

# Chỉ áp cho voice (không sửa `agent.system_prompt` dùng chung với chat text — text chat vẫn
# linh hoạt đa ngôn ngữ theo ngôn ngữ user gõ). Gemini native-audio models —
# theo tài liệu chính thức (ai.google.dev/gemini-api/docs/live-api/capabilities), dòng model
# này KHÔNG hỗ trợ `speechConfig.languageCode` để ép ngôn ngữ ("Native audio output models
# automatically choose the appropriate language and don't support explicitly setting the
# language code") — cách duy nhất có tài liệu là qua `system_instruction`. User yêu cầu
# (2026-08-24): chỉ nghe hiểu tiếng Việt/tiếng Anh, không muốn auto-detect toàn bộ ngôn ngữ (dễ
# nhận nhầm giọng nói) — ép model chỉ phân biệt 2 ngôn ngữ này và luôn trả lời tiếng Việt.
_VOICE_LANGUAGE_INSTRUCTION = (
    "\n\nUser chỉ nói tiếng Việt hoặc tiếng Anh (có thể xen lẫn) — khi nhận diện giọng nói, chỉ "
    "coi là 1 trong 2 ngôn ngữ này, không thử nhận diện ngôn ngữ khác. Luôn trả lời bằng tiếng "
    "Việt, bất kể user nói ngôn ngữ nào trong 2 ngôn ngữ đó."
)


def _to_voice_turn(row: Message) -> VoiceHistoryTurn | None:
    """Map `Message` ORM row → voice history turn — cùng tinh thần `_to_langchain`
    (`chat/service.py`, text chat): chỉ nạp `user`/`assistant`, bỏ `system`/`tool`."""
    if row.role == "user":
        return VoiceHistoryTurn(role="user", text=row.content)
    if row.role == "assistant":
        return VoiceHistoryTurn(role="model", text=row.content)
    return None


def _sub_agent_declarations(sub_agents: list[SubAgentSpec]) -> list[VoiceToolDeclaration]:
    """Khai cho voice provider biết agent orchestrator có thể delegate sub-agent nào.

    Chỉ khai tool ở tầng ngoài (không đệ quy sub-agent của sub-agent) — đủ cho scope hiện tại; nếu
    provider gọi 1 sub-agent orchestrator, `AgentRuntime.run_sync` (ADR-0020) vẫn tự xử lý đệ quy
    nội bộ như chat text.
    """
    return [
        VoiceToolDeclaration(
            name=sa.slug,
            description=sa.description or f"Delegate task to '{sa.slug}'",
            parameters={
                "type": "object",
                "properties": {"task": {"type": "string"}},
                "required": ["task"],
            },
        )
        for sa in sub_agents
    ]


def _kb_search_declarations(knowledge_bases: list[KnowledgeBaseSpec]) -> list[VoiceToolDeclaration]:
    """Khai tool RAG cho KB gán trực tiếp agent chính — cùng slug/description/param shape với
    `build_kb_search_tool` (`chat/graph.py`) để consistent với chat text, nhưng KHÔNG build tool
    thật ở đây (không cần session — schema `{query: string}` cố định, biết trước)."""
    return [
        VoiceToolDeclaration(
            name=f"search-knowledge-base-{kb.slug}",
            description=(
                f"Tìm thông tin liên quan trong knowledge base '{kb.name}'"
                + (f" — {kb.description}" if kb.description else "")
            ),
            parameters={
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        )
        for kb in knowledge_bases
    ]


async def _own_tool_declarations(
    tools: list[ToolSpec], *, session: AsyncSession
) -> list[VoiceToolDeclaration]:
    """Khai tool gắn TRỰC TIẾP trên agent chính (khác sub-agent delegate/KB — gap đã ghi trong
    roadmap: voice trước đây chỉ thấy sub-agent, không thấy tool/MCP gắn thẳng agent chính).

    Fail-closed (cùng lý do addendum ADR-0014 áp cho `run_sub_agent`): voice relay thẳng qua
    WebSocket, KHÔNG đi qua LangGraph checkpointer/approval-gate — tool rủi ro cao hoặc MCP (không
    biết trước server làm gì) không được khai cho voice gọi trực tiếp.

    Build tool 1 LẦN ở đây chỉ để lấy schema khai báo cho provider (`args_schema` runtime từ
    `ToolBuilder`, không có cách nào lấy schema mà không build) — KHÔNG giữ lại object build được
    để gọi sau: `session` truyền vào là session request-scoped của `ChatService`, không đủ sống lâu
    suốt voice session. Gọi tool thật (`_call_own_tool`) build lại với session riêng ngắn, cùng
    pattern `_agent_runtime.run_sync`/`_flush_transcript` đã dùng."""
    safe_tools = [t for t in tools if t.slug not in TOOLS_REQUIRING_APPROVAL and t.kind != "mcp"]
    built = await build_tools(safe_tools, session=session)
    declarations = []
    for lc_tool in built:
        schema = lc_tool.args_schema.model_json_schema() if lc_tool.args_schema else {}
        declarations.append(
            VoiceToolDeclaration(
                name=lc_tool.name,
                description=lc_tool.description or lc_tool.name,
                parameters={
                    "type": "object",
                    "properties": schema.get("properties", {}),
                    "required": schema.get("required", []),
                },
            )
        )
    return declarations


async def _call_own_tool(
    name: str,
    arguments: dict,
    *,
    tools: list[ToolSpec],
    knowledge_bases: list[KnowledgeBaseSpec],
) -> str | None:
    """Gọi 1 tool/KB search gắn trực tiếp agent chính (khác sub-agent, xem
    `handle_tool_call`/`_own_tool_declarations`) — trả `None` nếu `name` không khớp tool/KB nào (để
    caller tự phân biệt "không tìm thấy" với kết quả rỗng hợp lệ). Mở session riêng ngắn ngay lúc
    gọi — không tái dùng session request-scoped của `ChatService` (không đủ sống lâu suốt voice
    session, cùng lý do `_agent_runtime.run_sync` tự mở session riêng thay vì tái dùng)."""
    kb = next(
        (k for k in knowledge_bases if f"search-knowledge-base-{k.slug}" == name),
        None,
    )
    async with async_session_factory() as session:
        if kb is not None:
            search_tool = build_kb_search_tool(kb, session=session)
            return str(await search_tool.ainvoke(arguments))

        safe_tools = [
            t
            for t in tools
            if t.slug == name and t.slug not in TOOLS_REQUIRING_APPROVAL and t.kind != "mcp"
        ]
        if not safe_tools:
            return None
        built = await build_tools(safe_tools, session=session)
        if not built:
            return None
        return str(await built[0].ainvoke(arguments))


class VoiceService:
    """Relay 1 voice session: browser WebSocket ↔ voice provider (ADR-0009, ADR-0018).

    KHÔNG viết lại orchestrator — resolve agent/model/sub-agent/tool/KB qua
    `ChatService.resolve_context`, tool-call forward vào `run_sub_agent` (sub-agent) hoặc
    `_call_own_tool` (tool/KB gắn trực tiếp agent chính, chat/graph.py) — y như chat text, transport
    khác nhau.
    """

    def __init__(self, chat_service: ChatService) -> None:
        self.chat_service = chat_service

    async def run(self, websocket: WebSocket, conversation_id: int) -> None:
        # Resolve TRƯỚC accept() — conversation_id sai (404) phải đóng gọn gàng bằng WS close
        # code, không để HTTPException lọt qua exception handler HTTP (ghi JSON response lên
        # transport websocket → uvicorn raise, client nhận socket chết không rõ lý do).
        try:
            ctx = await self.chat_service.resolve_context(conversation_id)
        except Exception as exc:
            logger.warning("voice.session_rejected", conversation_id=conversation_id, exc_info=exc)
            await websocket.close(code=ws_status.WS_1008_POLICY_VIOLATION)
            return

        await websocket.accept()
        sub_agents = ctx.sub_agents

        try:
            # ADR-0018: chỉ Gemini là voice provider thật trong scope hiện tại. Tách qua registry
            # để thêm OpenAI Realtime/self-host pipeline sau này mà không sửa relay orchestration.
            provider = get_voice_provider("gemini")
            tool_declarations = [
                *_sub_agent_declarations(sub_agents),
                *_kb_search_declarations(ctx.knowledge_bases),
                *(await _own_tool_declarations(ctx.tools, session=self.chat_service.session)),
            ]
            client = provider.build_client(
                model_id=provider.default_model_id,
                system_instruction=ctx.system_prompt + _VOICE_LANGUAGE_INSTRUCTION,
                tools=tool_declarations,
            )
            # Session DB ngắn hạn chỉ để tra credential Gemini (ADR-0010) — không phải session
            # sống suốt voice session (giống lý do `_flush_transcript` mở session riêng).
            async with async_session_factory() as credential_session:
                await client.connect(credential_session)
            # Nạp lại lịch sử hội thoại cũ (voice cũ + text chat cũ) — mỗi lần bấm "Bắt đầu voice"
            # là 1 session Gemini Live hoàn toàn mới, KHÔNG tự nhớ gì từ session trước (bug thật,
            # phát hiện qua feedback user 2026-08-24: dừng voice rồi bắt đầu lại mất context thật,
            # khác với bug "ngắt lời AI giữa câu" — đó là trong CÙNG 1 session, đã fix riêng).
            # Không cap số lượng message — cùng cách text chat làm (`chat/service.py::send`, nạp
            # full history không phân trang), giữ nhất quán hành vi giữa 2 transport.
            history_rows = await self.chat_service.message_service.list_all(conversation_id)
            history_turns = [t for row in history_rows if (t := _to_voice_turn(row)) is not None]
            await client.send_history(history_turns)
        except Exception as exc:
            logger.error(
                "voice.provider_connect_failed", conversation_id=conversation_id, exc_info=exc
            )
            await websocket.close(code=ws_status.WS_1011_INTERNAL_ERROR)
            return

        logger.info("voice.session_started", conversation_id=conversation_id)
        transcript_buffer: dict[str, list[str]] = {"user": [], "model": []}
        pending_tool_calls: dict[str, asyncio.Task] = {}
        # None (không phải "listening") để lần gọi set_state("listening") đầu tiên chắc chắn gửi
        # được cho client — nếu khởi tạo sẵn "listening" thì lần gọi đầu bị no-op do so trùng giá
        # trị (bug thật, phát hiện qua live-test: client không nhận được state đầu tiên).
        state: VoiceState | None = None

        async def set_state(new_state: VoiceState) -> None:
            # Gemini Live không có event "state" tường minh — suy state từ event đã có (xem
            # docs/features/live-voice-agent.md, "Câu hỏi mở"): audio/text input → thinking (chỉ
            # với text, input audio là stream liên tục do server tự VAD nên không có mốc "user vừa
            # nói xong" ở phía client); audio/transcript model → speaking; tool call → using_tool;
            # interrupted/turn_complete → listening. Chỉ gửi khi thật sự đổi, tránh spam client.
            nonlocal state
            if new_state == state:
                return
            state = new_state
            await websocket.send_json({"type": "state", "value": new_state})

        await set_state("listening")

        async def forward_browser_to_provider() -> None:
            while True:
                message = await websocket.receive()
                if message["type"] == "websocket.disconnect":
                    return
                if message.get("bytes") is not None:
                    await client.send_audio_chunk(message["bytes"])
                elif message.get("text") is not None:
                    await client.send_text(message["text"])
                    await set_state("thinking")

        async def handle_tool_call(event: ToolCallRequested) -> None:
            try:
                sub_agent = next((sa for sa in sub_agents if sa.slug == event.name), None)
                if sub_agent is not None:
                    task_text = event.arguments.get("task", "")
                    # Session DB ngắn hạn riêng cho lần build chat model này (ADR-0010) — không
                    # giữ mở suốt lúc sub-agent LangGraph chạy (có thể vài giây).
                    async with async_session_factory() as session:
                        result = await _agent_runtime.run_sync(
                            sub_agent=sub_agent, task=task_text, session=session
                        )
                else:
                    # Không phải sub-agent → thử tool/KB search gắn trực tiếp agent chính
                    # (`_own_tool_declarations`/`_kb_search_declarations` — gap đã ghi trong
                    # roadmap: trước đây voice chỉ thấy được sub-agent).
                    result = await _call_own_tool(
                        event.name,
                        event.arguments,
                        tools=ctx.tools,
                        knowledge_bases=ctx.knowledge_bases,
                    )
                    if result is None:
                        await client.send_tool_result(
                            event.call_id, {"error": f"Không tìm thấy tool '{event.name}'"}
                        )
                        return
                await client.send_tool_result(event.call_id, {"result": result})
                logger.info(
                    "voice.tool_call_completed",
                    conversation_id=conversation_id,
                    tool_name=event.name,
                )
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error(
                    "voice.tool_call_failed",
                    conversation_id=conversation_id,
                    tool_name=event.name,
                    exc_info=exc,
                )
                await client.send_tool_result(event.call_id, {"error": str(exc)})
            finally:
                pending_tool_calls.pop(event.call_id, None)
                if not pending_tool_calls:
                    # Hết tool call đang chờ — model sẽ tiếp tục xử lý kết quả trước khi nói tiếp.
                    await set_state("thinking")

        async def forward_provider_to_browser() -> None:
            async for event in client.events():
                if isinstance(event, AudioDelta):
                    await set_state("speaking")
                    await websocket.send_bytes(event.pcm)
                elif isinstance(event, TranscriptDelta):
                    if event.role == "model":
                        await set_state("speaking")
                    transcript_buffer[event.role].append(event.text)
                    await websocket.send_json(
                        {"type": "transcript", "role": event.role, "text": event.text}
                    )
                elif isinstance(event, Interrupted):
                    # Lời agent đang nói bị cắt giữa câu — transcript model tích luỹ tới đây
                    # không phải câu hoàn chỉnh, bỏ đi thay vì lưu như đã nói xong. Lời user vẫn
                    # giữ nguyên (không bị ảnh hưởng bởi việc agent bị ngắt).
                    transcript_buffer["model"].clear()
                    await set_state("listening")
                    await websocket.send_json({"type": "interrupted"})
                elif isinstance(event, TurnComplete):
                    # Gemini bắn `turnComplete` khá "nhạy" — kể cả khi user chỉ ngắt lời AI giữa
                    # câu (barge-in: `interrupted` + `turnComplete` cùng lúc) hoặc khi VAD đoán
                    # user dừng nói nhưng model không trả lời gì. Nếu chốt (flush) mù theo mọi
                    # `turnComplete`, nói tiếp sau đó bị tính là 1 `Message` MỚI, tách rời — user
                    # thấy nhiều bubble rời rạc dù thực ra model (cùng 1 session Gemini Live) vẫn
                    # nhớ nguyên vẹn, chỉ là tầng lưu DB/hiển thị bị cắt vụn (bug thật, phát hiện
                    # qua feedback user 2026-08-24). Chỉ chốt + báo client khi model ĐÃ thật sự trả
                    # lời — user nói tiếp mà chưa có phản hồi thì gộp tiếp vào cùng buffer, không
                    # tạo turn mới.
                    if transcript_buffer["model"]:
                        await self._flush_transcript(conversation_id, transcript_buffer)
                        await websocket.send_json({"type": "turn_complete"})
                    await set_state("listening")
                elif isinstance(event, ToolCallRequested):
                    # Chạy tool ở background — không chặn audio/transcript đang chảy trong lúc
                    # sub-agent (LangGraph) xử lý, có thể tốn vài giây (spec: "vừa nói vừa chạy
                    # tool ở background").
                    await set_state("using_tool")
                    pending_tool_calls[event.call_id] = asyncio.create_task(handle_tool_call(event))
                elif isinstance(event, ToolCallCancelled):
                    task = pending_tool_calls.pop(event.call_id, None)
                    if task is not None:
                        task.cancel()
                elif isinstance(event, SessionEnding):
                    logger.warning(
                        "voice.session_ending",
                        conversation_id=conversation_id,
                        time_left=event.time_left,
                    )

        tasks = [
            asyncio.create_task(forward_browser_to_provider()),
            asyncio.create_task(forward_provider_to_browser()),
        ]
        try:
            # 1 trong 2 chiều đóng (browser disconnect hoặc Gemini đóng kết nối) là đủ để kết
            # thúc session — không chờ cả 2 xong (chúng chỉ dừng khi có phía đóng kết nối).
            done, _pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                exc = task.exception()
                if exc is not None:
                    logger.error(
                        "voice.session_failed", conversation_id=conversation_id, exc_info=exc
                    )
        finally:
            # Đóng provider connection trước (websockets khuyên đóng chủ động thay vì cancel task
            # đang gửi/nhận giữa chừng), rồi mới cancel task còn treo + tool call đang chạy, chờ
            # tất cả dừng thật trước khi return — tránh "Task was destroyed but it is pending".
            await client.close()
            for task in [*tasks, *pending_tool_calls.values()]:
                task.cancel()
            await asyncio.gather(*tasks, *pending_tool_calls.values(), return_exceptions=True)
            # Buffer có thể còn transcript chưa chốt (turn cuối chưa có phản hồi model lúc session
            # kết thúc, xem nhánh TurnComplete phía trên) — flush lần cuối để không mất trắng.
            await self._flush_transcript(conversation_id, transcript_buffer)
            logger.info("voice.session_ended", conversation_id=conversation_id)

    async def _flush_transcript(self, conversation_id: int, buffer: dict[str, list[str]]) -> None:
        """Mở session DB riêng, ngắn, commit ngay — KHÔNG dùng session request-scoped của
        `ChatService` (session đó sống suốt cả voice session, có thể nhiều phút, giữ transaction
        mở + rollback hết nếu handler lỗi giữa đường — mất transcript đã lưu trước đó)."""
        if not buffer["user"] and not buffer["model"]:
            return
        async with async_session_factory() as session:
            message_service = get_message_service(session)
            if buffer["user"]:
                await message_service.append(
                    conversation_id, MessageCreate(role="user", content="".join(buffer["user"]))
                )
                buffer["user"].clear()
            if buffer["model"]:
                await message_service.append(
                    conversation_id,
                    MessageCreate(role="assistant", content="".join(buffer["model"])),
                )
                buffer["model"].clear()
            await session.commit()
