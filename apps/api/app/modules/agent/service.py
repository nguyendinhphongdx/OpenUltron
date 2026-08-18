from __future__ import annotations

from fastapi import HTTPException, status

from app.modules.agent.models import Agent
from app.modules.agent.repository import AgentRepository
from app.modules.agent.schemas import (
    AgentCreate,
    AgentDelegationRead,
    AgentRead,
    AgentUpdate,
)
from app.modules.model.repository import ModelRepository


def agent_to_read(row: Agent) -> AgentRead:
    return AgentRead(
        id=row.id,
        slug=row.slug,
        name=row.name,
        description=row.description,
        system_prompt=row.system_prompt,
        model_id=row.model_id,
        is_orchestrator=row.is_orchestrator,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class AgentService:
    def __init__(self, repo: AgentRepository, model_repo: ModelRepository) -> None:
        self.repo = repo
        self.model_repo = model_repo

    async def create(self, input: AgentCreate) -> AgentRead:
        existing = await self.repo.get_by_slug(input.slug)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=f"Agent slug '{input.slug}' đã tồn tại"
            )
        if await self.model_repo.get(input.model_id) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model {input.model_id} không tồn tại — tạo Model trước (POST /models)",
            )
        row = await self.repo.create(**input.model_dump())
        return agent_to_read(row)

    async def list(self) -> list[AgentRead]:
        return [agent_to_read(r) for r in await self.repo.list()]

    async def get_or_404(self, agent_id: int) -> Agent:
        row = await self.repo.get(agent_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Agent {agent_id} không tồn tại"
            )
        return row

    async def get(self, agent_id: int) -> AgentRead:
        return agent_to_read(await self.get_or_404(agent_id))

    async def update(self, agent_id: int, input: AgentUpdate) -> AgentRead:
        row = await self.get_or_404(agent_id)
        for field, value in input.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        return agent_to_read(row)

    async def remove(self, agent_id: int) -> None:
        row = await self.get_or_404(agent_id)
        await self.repo.delete(row)

    async def add_delegation(
        self, orchestrator_agent_id: int, sub_agent_id: int
    ) -> AgentDelegationRead:
        orchestrator = await self.get_or_404(orchestrator_agent_id)
        sub_agent = await self.get_or_404(sub_agent_id)
        if orchestrator.id == sub_agent.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent không thể tự delegate cho mình",
            )
        if not orchestrator.is_orchestrator:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent '{orchestrator.slug}' chưa đánh dấu is_orchestrator=true",
            )
        row = await self.repo.add_delegation(orchestrator.id, sub_agent.id)
        return AgentDelegationRead(
            id=row.id,
            orchestrator_agent_id=row.orchestrator_agent_id,
            sub_agent_id=row.sub_agent_id,
        )

    async def list_sub_agents(self, orchestrator_agent_id: int) -> list[AgentRead]:
        return [agent_to_read(r) for r in await self.repo.list_sub_agents(orchestrator_agent_id)]
