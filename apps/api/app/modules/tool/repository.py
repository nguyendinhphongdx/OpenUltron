from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tool.models import AgentTool, Tool


class ToolRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, **fields: object) -> Tool:
        row = Tool(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get(self, tool_id: int) -> Tool | None:
        return await self.session.get(Tool, tool_id)

    async def get_by_slug(self, slug: str) -> Tool | None:
        stmt = select(Tool).where(Tool.slug == slug)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list(self) -> list[Tool]:
        stmt = select(Tool).order_by(Tool.created_at.asc())
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete(self, row: Tool) -> None:
        await self.session.delete(row)

    async def get_agent_tool(self, agent_id: int, tool_id: int) -> AgentTool | None:
        stmt = select(AgentTool).where(AgentTool.agent_id == agent_id, AgentTool.tool_id == tool_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def add_agent_tool(self, agent_id: int, tool_id: int) -> AgentTool:
        row = AgentTool(agent_id=agent_id, tool_id=tool_id)
        self.session.add(row)
        await self.session.flush()
        return row

    async def remove_agent_tool(self, agent_id: int, tool_id: int) -> bool:
        row = await self.get_agent_tool(agent_id, tool_id)
        if row is None:
            return False
        await self.session.delete(row)
        return True

    async def list_tools_for_agent(self, agent_id: int) -> list[Tool]:
        stmt = (
            select(Tool)
            .join(AgentTool, AgentTool.tool_id == Tool.id)
            .where(AgentTool.agent_id == agent_id)
        )
        return list((await self.session.execute(stmt)).scalars().all())
