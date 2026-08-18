from fastapi import APIRouter

from app.modules.agent.deps import AgentServiceDep
from app.modules.agent.schemas import ChatRequest
from app.modules.conversation.deps import ConversationServiceDep
from app.modules.conversation.message.schemas import MessageRead

router = APIRouter(prefix="/conversations/{conversation_id}/chat", tags=["agent"])


@router.post("", response_model=MessageRead)
async def chat(
    conversation_id: int,
    body: ChatRequest,
    conversations: ConversationServiceDep,
    agent: AgentServiceDep,
) -> MessageRead:
    """Chạy graph LangGraph 1 turn: lưu user message, gọi model, lưu + trả assistant message.

    Bản đầu (ADR-0005): chưa streaming, chưa tool, chưa approval-gate — trả nguyên
    response sau khi graph chạy xong.
    """
    await conversations.get_or_404(conversation_id)
    return await agent.send(conversation_id, body.content)
