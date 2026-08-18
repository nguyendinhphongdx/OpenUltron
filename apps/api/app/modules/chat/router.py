from fastapi import APIRouter

from app.modules.chat.deps import ChatServiceDep
from app.modules.chat.schemas import ChatRequest
from app.modules.conversation.deps import ConversationServiceDep
from app.modules.conversation.message.schemas import MessageRead

router = APIRouter(prefix="/conversations/{conversation_id}/chat", tags=["chat"])


@router.post("", response_model=MessageRead)
async def chat(
    conversation_id: int,
    body: ChatRequest,
    conversations: ConversationServiceDep,
    chat_service: ChatServiceDep,
) -> MessageRead:
    """Chạy 1 turn: lưu user message, chọn agent (ADR-0006), gọi graph, lưu assistant message.

    Bản đầu: chưa streaming, chưa approval-gate (ADR-0005).
    """
    await conversations.get_or_404(conversation_id)
    return await chat_service.send(conversation_id, body.content)
