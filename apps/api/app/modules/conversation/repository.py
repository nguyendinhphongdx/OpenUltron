from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.conversation.models import Conversation


class ConversationRepository:
    """Chỉ query DB — không business logic (docs/conventions/01-backend-fastapi.md)."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, **fields: object) -> Conversation:
        row = Conversation(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get(self, conversation_id: int) -> Conversation | None:
        return await self.session.get(Conversation, conversation_id)

    async def list(
        self,
        *,
        channel: str | None,
        external_user_id: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Conversation], int]:
        stmt = select(Conversation)
        count_stmt = select(func.count()).select_from(Conversation)
        if channel:
            stmt = stmt.where(Conversation.channel == channel)
            count_stmt = count_stmt.where(Conversation.channel == channel)
        if external_user_id:
            stmt = stmt.where(Conversation.external_user_id == external_user_id)
            count_stmt = count_stmt.where(Conversation.external_user_id == external_user_id)

        stmt = (
            stmt.order_by(Conversation.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        total = (await self.session.execute(count_stmt)).scalar_one()
        return list(rows), total

    async def delete(self, row: Conversation) -> None:
        await self.session.delete(row)
