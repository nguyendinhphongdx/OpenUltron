import asyncio
from typing import Literal

from fastapi import WebSocket
from fastapi import status as ws_status

from app.core.logging import logger
from app.db.session import async_session_factory
from app.modules.chat.graph import SubAgentSpec, run_sub_agent
from app.modules.chat.service import ChatService
from app.modules.conversation.message.deps import get_message_service
from app.modules.conversation.message.schemas import MessageCreate
from app.modules.voice.events import (
    AudioDelta,
    Interrupted,
    SessionEnding,
    ToolCallCancelled,
    ToolCallRequested,
    TranscriptDelta,
    TurnComplete,
)
from app.modules.voice.gemini_live_client import GeminiLiveClient

# Xác nhận thật qua GET /v1beta/models (ListModels) với GEMINI_API_KEY thật — model này là 1
# trong số ít model hỗ trợ bidiGenerateContent tại thời điểm live-test (2026-08-23). Google có
# thể đổi/rotate model Live theo thời gian — nếu lỗi "model not found for bidiGenerateContent",
# gọi lại ListModels để lấy tên hiện hành thay vì đoán.
_GEMINI_LIVE_MODEL = "gemini-2.5-flash-native-audio-latest"

VoiceState = Literal["listening", "thinking", "speaking", "using_tool"]

# Chỉ áp cho voice (không sửa `agent.system_prompt` dùng chung với chat text — text chat vẫn
# linh hoạt đa ngôn ngữ theo ngôn ngữ user gõ). Model `_GEMINI_LIVE_MODEL` là native-audio —
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


def _tool_declarations(sub_agents: list[SubAgentSpec]) -> list[dict]:
    """Khai cho Gemini Live biết agent orchestrator có thể delegate sub-agent nào. Chỉ khai tool ở
    tầng ngoài (không đệ quy sub-agent của sub-agent) — đủ cho scope hiện tại; nếu Gemini gọi 1
    sub-agent orchestrator, `run_sub_agent` vẫn tự xử lý đệ quy nội bộ như chat text."""
    if not sub_agents:
        return []
    return [
        {
            "functionDeclarations": [
                {
                    "name": sa.slug,
                    "description": sa.description or f"Delegate task to '{sa.slug}'",
                    "parameters": {
                        "type": "object",
                        "properties": {"task": {"type": "string"}},
                        "required": ["task"],
                    },
                }
                for sa in sub_agents
            ]
        }
    ]


class VoiceService:
    """Relay 1 voice session: browser WebSocket ↔ Gemini Live (ADR-0009). KHÔNG viết lại
    orchestrator — resolve agent/model/sub-agent qua `ChatService.resolve_context`, tool-call
    forward vào `run_sub_agent` (chat/graph.py) — y như chat text, transport khác nhau."""

    def __init__(self, chat_service: ChatService) -> None:
        self.chat_service = chat_service

    async def run(self, websocket: WebSocket, conversation_id: int) -> None:
        # Resolve TRƯỚC accept() — conversation_id sai (404) phải đóng gọn gàng bằng WS close
        # code, không để HTTPException lọt qua exception handler HTTP (ghi JSON response lên
        # transport websocket → uvicorn raise, client nhận socket chết không rõ lý do).
        try:
            (
                system_prompt,
                _model,
                sub_agents,
                _tool_specs,
            ) = await self.chat_service.resolve_context(conversation_id)
        except Exception as exc:
            logger.warning("voice.session_rejected", conversation_id=conversation_id, exc_info=exc)
            await websocket.close(code=ws_status.WS_1008_POLICY_VIOLATION)
            return

        await websocket.accept()

        try:
            client = GeminiLiveClient(
                model=_GEMINI_LIVE_MODEL,
                system_instruction=system_prompt + _VOICE_LANGUAGE_INSTRUCTION,
                tools=_tool_declarations(sub_agents),
            )
            # Session DB ngắn hạn chỉ để tra credential Gemini (ADR-0010) — không phải session
            # sống suốt voice session (giống lý do `_flush_transcript` mở session riêng).
            async with async_session_factory() as credential_session:
                await client.connect(credential_session)
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

        async def forward_browser_to_gemini() -> None:
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
                if sub_agent is None:
                    await client.send_tool_result(
                        event.call_id, {"error": f"Không tìm thấy sub-agent '{event.name}'"}
                    )
                    return
                task_text = event.arguments.get("task", "")
                # Session DB ngắn hạn riêng cho lần build chat model này (ADR-0010) — không giữ
                # mở suốt lúc sub-agent LangGraph chạy (có thể vài giây).
                async with async_session_factory() as session:
                    result = await run_sub_agent(sub_agent, task_text, session=session)
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

        async def forward_gemini_to_browser() -> None:
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
                    await self._flush_transcript(conversation_id, transcript_buffer)
                    await set_state("listening")
                    await websocket.send_json({"type": "turn_complete"})
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
            asyncio.create_task(forward_browser_to_gemini()),
            asyncio.create_task(forward_gemini_to_browser()),
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
