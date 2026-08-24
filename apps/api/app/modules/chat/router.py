import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.modules.chat.deps import ChatServiceDep
from app.modules.chat.schemas import ChatRequest

router = APIRouter(prefix="/conversations/{conversation_id}/chat", tags=["chat"])


@router.post("")
async def chat(
    conversation_id: int,
    body: ChatRequest,
    chat_service: ChatServiceDep,
) -> StreamingResponse:
    """Chạy 1 turn qua SSE (chat-streaming, docs/features/chat-streaming.md): lưu user message,
    chọn agent (ADR-0006), stream token model + tool-call event, lưu assistant message khi xong.

    Response luôn `200 text/event-stream` — lỗi giữa lúc chạy (thiếu credential, model không phản
    hồi...) là 1 event `{"type": "error", "message": ...}` trong body, không phải HTTP status
    khác (status đã gửi cho client trước khi ta có thể biết lỗi). `ChatService.send` tự
    get_or_404 conversation (qua ConversationService) — không cần check trùng ở router.
    """

    async def event_stream():
        async for event in chat_service.send(conversation_id, body.content):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
