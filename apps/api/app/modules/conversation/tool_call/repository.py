from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.conversation.models import ToolCall


class ToolCallRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, **fields: object) -> ToolCall:
        row = ToolCall(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get(self, tool_call_id: int) -> ToolCall | None:
        return await self.session.get(ToolCall, tool_call_id)
