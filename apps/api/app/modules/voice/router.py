from fastapi import APIRouter, WebSocket

from app.modules.voice.deps import VoiceServiceDep

router = APIRouter(prefix="/conversations/{conversation_id}/voice", tags=["voice"])


@router.websocket("")
async def voice_session(
    websocket: WebSocket,
    conversation_id: int,
    voice_service: VoiceServiceDep,
) -> None:
    """Relay 1 voice session — browser audio (PCM binary frame) ↔ Gemini Live (ADR-0009).

    Đã live-test qua text fallback với `GEMINI_API_KEY` thật (xem `gemini_live_client.py`) — nhánh
    audio binary frame chưa test (chưa có client capture audio thật ở `apps/web`). Chưa có
    approval-gate riêng cho tool chạy lệnh máy (ADR-0005) — `run_sub_agent` chỉ delegate sub-agent,
    không đụng tool có side-effect nguy hiểm.
    """
    await voice_service.run(websocket, conversation_id)
