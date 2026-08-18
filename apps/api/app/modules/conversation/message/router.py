from fastapi import APIRouter, Query, status

from app.common.pagination import Paginated
from app.modules.conversation.deps import ConversationServiceDep
from app.modules.conversation.message.deps import MessageServiceDep
from app.modules.conversation.message.schemas import MessageCreate, MessageRead

router = APIRouter(prefix="/conversations/{conversation_id}/messages", tags=["messages"])


@router.post("", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def append_message(
    conversation_id: int,
    body: MessageCreate,
    conversations: ConversationServiceDep,
    messages: MessageServiceDep,
) -> MessageRead:
    await conversations.get_or_404(conversation_id)  # 404 sớm nếu conversation không tồn tại
    return await messages.append(conversation_id, body)


@router.get("", response_model=Paginated[MessageRead])
async def list_messages(
    conversation_id: int,
    conversations: ConversationServiceDep,
    messages: MessageServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> Paginated[MessageRead]:
    await conversations.get_or_404(conversation_id)
    return await messages.list(conversation_id, page=page, page_size=page_size)
