from fastapi import APIRouter, Query, status

from app.common.pagination import Paginated
from app.modules.conversation.deps import ConversationServiceDep
from app.modules.conversation.schemas import (
    ConversationCreate,
    ConversationRead,
    ConversationUpdate,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate, service: ConversationServiceDep
) -> ConversationRead:
    return await service.create(body)


@router.get("", response_model=Paginated[ConversationRead])
async def list_conversations(
    service: ConversationServiceDep,
    channel: str | None = Query(default=None),
    external_user_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Paginated[ConversationRead]:
    return await service.list(
        channel=channel, external_user_id=external_user_id, page=page, page_size=page_size
    )


@router.get("/{conversation_id}", response_model=ConversationRead)
async def get_conversation(
    conversation_id: int, service: ConversationServiceDep
) -> ConversationRead:
    return await service.get(conversation_id)


@router.patch("/{conversation_id}", response_model=ConversationRead)
async def update_conversation(
    conversation_id: int, body: ConversationUpdate, service: ConversationServiceDep
) -> ConversationRead:
    return await service.update(conversation_id, body)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: int, service: ConversationServiceDep) -> None:
    await service.remove(conversation_id)
