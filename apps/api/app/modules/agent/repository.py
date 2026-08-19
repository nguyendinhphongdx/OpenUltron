from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.agent.models import Agent, AgentDelegation


class AgentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, **fields: object) -> Agent:
        row = Agent(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get(self, agent_id: int) -> Agent | None:
        return await self.session.get(Agent, agent_id)

    async def get_by_slug(self, slug: str) -> Agent | None:
        stmt = select(Agent).where(Agent.slug == slug)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list(self) -> list[Agent]:
        stmt = select(Agent).order_by(Agent.created_at.asc())
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete(self, row: Agent) -> None:
        await self.session.delete(row)

    async def get_delegation(
        self, orchestrator_agent_id: int, sub_agent_id: int
    ) -> AgentDelegation | None:
        stmt = select(AgentDelegation).where(
            AgentDelegation.orchestrator_agent_id == orchestrator_agent_id,
            AgentDelegation.sub_agent_id == sub_agent_id,
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def add_delegation(
        self, orchestrator_agent_id: int, sub_agent_id: int
    ) -> AgentDelegation:
        row = AgentDelegation(
            orchestrator_agent_id=orchestrator_agent_id, sub_agent_id=sub_agent_id
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_sub_agents(self, orchestrator_agent_id: int) -> list[Agent]:
        stmt = (
            select(Agent)
            .join(AgentDelegation, AgentDelegation.sub_agent_id == Agent.id)
            .where(AgentDelegation.orchestrator_agent_id == orchestrator_agent_id)
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def list_delegations(self, orchestrator_agent_id: int) -> list[AgentDelegation]:
        stmt = select(AgentDelegation).where(
            AgentDelegation.orchestrator_agent_id == orchestrator_agent_id
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def remove_delegation(self, orchestrator_agent_id: int, sub_agent_id: int) -> bool:
        row = await self.get_delegation(orchestrator_agent_id, sub_agent_id)
        if row is None:
            return False
        await self.session.delete(row)
        return True
