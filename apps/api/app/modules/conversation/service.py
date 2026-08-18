from fastapi import HTTPException, status

from app.common.pagination import Paginated, paginate
from app.modules.conversation.models import Conversation
from app.modules.conversation.repository import ConversationRepository
from app.modules.conversation.schemas import (
    ConversationCreate,
    ConversationRead,
    ConversationUpdate,
)


def _to_read(row: Conversation) -> ConversationRead:
    return ConversationRead(
        id=row.id,
        channel=row.channel,
        external_user_id=row.external_user_id,
        agent=row.agent,
        title=row.title,
        metadata=row.metadata_,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class ConversationService:
    """Business logic — throw HTTPException, không trả raw ORM object."""

    def __init__(self, repo: ConversationRepository) -> None:
        self.repo = repo

    async def create(self, input: ConversationCreate) -> ConversationRead:
        row = await self.repo.create(
            channel=input.channel,
            external_user_id=input.external_user_id,
            agent=input.agent,
            title=input.title,
            metadata_=input.metadata,
        )
        return _to_read(row)

    async def list(
        self, *, channel: str | None, external_user_id: str | None, page: int, page_size: int
    ) -> Paginated[ConversationRead]:
        rows, total = await self.repo.list(
            channel=channel, external_user_id=external_user_id, page=page, page_size=page_size
        )
        return paginate([_to_read(r) for r in rows], total, page, page_size)

    async def get_or_404(self, conversation_id: int) -> Conversation:
        row = await self.repo.get(conversation_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} không tồn tại",
            )
        return row

    async def get(self, conversation_id: int) -> ConversationRead:
        return _to_read(await self.get_or_404(conversation_id))

    async def update(self, conversation_id: int, input: ConversationUpdate) -> ConversationRead:
        row = await self.get_or_404(conversation_id)
        for field, value in input.model_dump(exclude_unset=True).items():
            setattr(row, "metadata_" if field == "metadata" else field, value)
        return _to_read(row)

    async def remove(self, conversation_id: int) -> None:
        row = await self.get_or_404(conversation_id)
        await self.repo.delete(row)
