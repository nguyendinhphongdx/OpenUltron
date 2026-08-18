from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.conversation.models import Message


class MessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def next_seq(self, conversation_id: int) -> int:
        stmt = select(func.coalesce(func.max(Message.seq), 0)).where(
            Message.conversation_id == conversation_id
        )
        current = (await self.session.execute(stmt)).scalar_one()
        return current + 1

    async def create(self, **fields: object) -> Message:
        row = Message(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_all_by_conversation(self, conversation_id: int) -> list[Message]:
        """Không phân trang — dùng để nạp history vào graph (app/modules/agent)."""
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.seq.asc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def list_by_conversation(
        self, conversation_id: int, *, page: int, page_size: int
    ) -> tuple[list[Message], int]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.seq.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        count_stmt = select(func.count()).select_from(Message).where(
            Message.conversation_id == conversation_id
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        total = (await self.session.execute(count_stmt)).scalar_one()
        return list(rows), total
