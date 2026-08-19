from fastapi import APIRouter

from app.modules.chat.deps import ChatServiceDep
from app.modules.chat.schemas import ChatRequest
from app.modules.conversation.message.schemas import MessageRead

router = APIRouter(prefix="/conversations/{conversation_id}/chat", tags=["chat"])


@router.post("", response_model=MessageRead)
async def chat(
    conversation_id: int,
    body: ChatRequest,
    chat_service: ChatServiceDep,
) -> MessageRead:
    """Chạy 1 turn: lưu user message, chọn agent (ADR-0006), gọi graph, lưu assistant message.

    Bản đầu: chưa streaming, chưa approval-gate (ADR-0005). `ChatService.send` tự get_or_404
    conversation (qua ConversationService) — không cần check trùng ở router.
    """
    return await chat_service.send(conversation_id, body.content)
