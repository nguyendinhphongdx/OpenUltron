import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.modules.chat.deps import ChatServiceDep
from app.modules.chat.schemas import AgUiRunRequest

router = APIRouter(prefix="/conversations/{conversation_id}/chat", tags=["chat"])


@router.post("/agui")
async def chat_agui(
    conversation_id: int,
    body: AgUiRunRequest,
    chat_service: ChatServiceDep,
) -> StreamingResponse:
    """AG-UI adapter endpoint (ADR-0019): nhận `RunAgentInput` từ `@ag-ui/client` `HttpAgent`,
    stream AG-UI `EventType` JSON qua SSE để `assistant-ui` đọc trực tiếp. Route HTTP cũ
    (`POST .../chat`, `.../chat/approve`, pre-AG-UI) đã xoá — `apps/web` chỉ còn gọi endpoint này;
    `ChatService.send`/`ChatService.approve` (method Python) vẫn còn, được `send_agui` gọi nội
    bộ."""

    async def event_stream():
        async for event in chat_service.send_agui(conversation_id, body):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
