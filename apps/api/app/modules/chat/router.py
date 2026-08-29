import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.modules.chat.deps import ChatServiceDep
from app.modules.chat.schemas import AgUiRunRequest, ApprovalRequest, ChatRequest

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
    get_or_404 conversation (qua ConversationService) — không cần check trùng ở router. Turn có
    thể pause giữa đường chờ duyệt (event `approval_required` — xem `/approve` bên dưới, ADR-0014).
    """

    async def event_stream():
        async for event in chat_service.send(conversation_id, body.content):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/approve")
async def approve(
    conversation_id: int,
    body: ApprovalRequest,
    chat_service: ChatServiceDep,
) -> StreamingResponse:
    """Duyệt/từ chối 1 tool call đang chờ (approval gate, ADR-0014) — resume đúng turn đang pause
    (`thread_id` = `conversation_id` ở checkpointer), tiếp tục stream SSE từ điểm dừng (không phải
    turn mới). Gọi khi client nhận được event `approval_required` từ `POST .../chat`."""

    async def event_stream():
        async for event in chat_service.approve(conversation_id, body.decision):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/agui")
async def chat_agui(
    conversation_id: int,
    body: AgUiRunRequest,
    chat_service: ChatServiceDep,
) -> StreamingResponse:
    """AG-UI adapter endpoint (ADR-0019): nhận `RunAgentInput` từ `@ag-ui/client` `HttpAgent`,
    stream AG-UI `EventType` JSON qua SSE để `assistant-ui` đọc trực tiếp. Endpoint `/chat` cũ
    vẫn giữ compatibility trong giai đoạn migrate."""

    async def event_stream():
        async for event in chat_service.send_agui(conversation_id, body):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
