from __future__ import annotations

from app.common.pagination import Paginated, paginate
from app.modules.conversation.message.repository import MessageRepository
from app.modules.conversation.message.schemas import MessageCreate, MessageRead
from app.modules.conversation.models import Message


def message_to_read(row: Message) -> MessageRead:
    return MessageRead(
        id=row.id,
        conversation_id=row.conversation_id,
        seq=row.seq,
        role=row.role,
        content=row.content,
        tokens_prompt=row.tokens_prompt,
        tokens_completion=row.tokens_completion,
        cost_usd=row.cost_usd,
        metadata=row.metadata_,
        created_at=row.created_at,
    )


class MessageService:
    def __init__(self, repo: MessageRepository) -> None:
        self.repo = repo

    async def append(self, conversation_id: int, input: MessageCreate) -> MessageRead:
        seq = await self.repo.next_seq(conversation_id)
        row = await self.repo.create(
            conversation_id=conversation_id,
            seq=seq,
            role=input.role,
            content=input.content,
            tokens_prompt=input.tokens_prompt,
            tokens_completion=input.tokens_completion,
            cost_usd=input.cost_usd,
            metadata_=input.metadata,
        )
        return message_to_read(row)

    async def list(
        self, conversation_id: int, *, page: int, page_size: int
    ) -> Paginated[MessageRead]:
        rows, total = await self.repo.list_by_conversation(
            conversation_id, page=page, page_size=page_size
        )
        return paginate([message_to_read(r) for r in rows], total, page, page_size)
