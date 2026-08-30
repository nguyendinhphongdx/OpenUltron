from __future__ import annotations

from app.core.errors import ConflictError, ResourceNotFoundError, ValidationFailedError
from app.modules.agent.models import Agent
from app.modules.agent.repository import AgentRepository
from app.modules.agent.schemas import (
    AgentCreate,
    AgentDelegationDetailRead,
    AgentDelegationRead,
    AgentRead,
    AgentUpdate,
)
from app.modules.model.service import ModelService


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
    def __init__(self, repo: AgentRepository, model_service: ModelService) -> None:
        self.repo = repo
        self.model_service = model_service

    async def create(self, input: AgentCreate) -> AgentRead:
        existing = await self.repo.get_by_slug(input.slug)
        if existing is not None:
            raise ConflictError(f"Agent slug '{input.slug}' đã tồn tại")
        if await self.model_service.find(input.model_id) is None:
            raise ValidationFailedError(
                f"Model {input.model_id} không tồn tại — tạo Model trước (POST /models)"
            )
        row = await self.repo.create(**input.model_dump())
        return agent_to_read(row)

    async def list(self) -> list[AgentRead]:
        return [agent_to_read(r) for r in await self.repo.list()]

    async def find(self, agent_id: int) -> Agent | None:
        """Existence check dùng bởi service module khác (không import AgentRepository trực tiếp)."""
        return await self.repo.get(agent_id)

    async def get_or_404(self, agent_id: int) -> Agent:
        row = await self.find(agent_id)
        if row is None:
            raise ResourceNotFoundError("Agent", agent_id)
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
        self,
        orchestrator_agent_id: int,
        sub_agent_id: int,
        task_description: str | None = None,
    ) -> AgentDelegationRead:
        orchestrator = await self.get_or_404(orchestrator_agent_id)
        sub_agent = await self.get_or_404(sub_agent_id)
        if orchestrator.id == sub_agent.id:
            raise ValidationFailedError("Agent không thể tự delegate cho mình")
        if not orchestrator.is_orchestrator:
            raise ValidationFailedError(
                f"Agent '{orchestrator.slug}' chưa đánh dấu is_orchestrator=true"
            )
        if await self.repo.get_delegation(orchestrator.id, sub_agent.id) is not None:
            raise ConflictError(
                f"Agent '{sub_agent.slug}' đã được delegate cho '{orchestrator.slug}'"
            )
        if await self._creates_cycle(orchestrator.id, sub_agent.id):
            raise ValidationFailedError(
                f"Gán '{sub_agent.slug}' làm sub-agent của '{orchestrator.slug}' sẽ tạo vòng "
                "lặp (agent gọi ngược lại chính nó qua chuỗi delegate) — không cho phép."
            )
        row = await self.repo.add_delegation(orchestrator.id, sub_agent.id, task_description)
        return AgentDelegationRead(
            id=row.id,
            orchestrator_agent_id=row.orchestrator_agent_id,
            sub_agent_id=row.sub_agent_id,
            task_description=row.task_description,
        )

    async def update_delegation(
        self, orchestrator_agent_id: int, sub_agent_id: int, task_description: str | None
    ) -> AgentDelegationRead:
        row = await self.repo.get_delegation(orchestrator_agent_id, sub_agent_id)
        if row is None:
            raise ResourceNotFoundError(
                "AgentDelegation", f"{sub_agent_id} (orchestrator_agent_id={orchestrator_agent_id})"
            )
        row.task_description = task_description
        return AgentDelegationRead(
            id=row.id,
            orchestrator_agent_id=row.orchestrator_agent_id,
            sub_agent_id=row.sub_agent_id,
            task_description=row.task_description,
        )

    async def list_sub_agents(self, orchestrator_agent_id: int) -> list[AgentRead]:
        return [agent_to_read(r) for r in await self.repo.list_sub_agents(orchestrator_agent_id)]

    async def list_delegation_details(
        self, orchestrator_agent_id: int
    ) -> list[AgentDelegationDetailRead]:
        """Edge + sub-agent lồng — dùng bởi canvas (hiển thị edge contract) và
        `ChatService._resolve_sub_agent_spec` (đọc `task_description` làm mô tả tool `delegate`)."""
        return [
            AgentDelegationDetailRead(
                id=delegation.id,
                orchestrator_agent_id=delegation.orchestrator_agent_id,
                sub_agent_id=delegation.sub_agent_id,
                task_description=delegation.task_description,
                sub_agent=agent_to_read(sub_agent),
            )
            for delegation, sub_agent in await self.repo.list_delegations_with_sub_agents(
                orchestrator_agent_id
            )
        ]

    async def remove_delegation(self, orchestrator_agent_id: int, sub_agent_id: int) -> None:
        removed = await self.repo.remove_delegation(orchestrator_agent_id, sub_agent_id)
        if not removed:
            raise ResourceNotFoundError(
                "AgentDelegation", f"{sub_agent_id} (orchestrator_agent_id={orchestrator_agent_id})"
            )

    async def _creates_cycle(self, orchestrator_agent_id: int, sub_agent_id: int) -> bool:
        """BFS xuôi theo chiều delegate (orchestrator -> sub-agent) bắt đầu từ `sub_agent_id`.

        Nếu đi tới được `orchestrator_agent_id` nghĩa là cạnh mới sẽ tạo vòng lặp — orchestrator
        gián tiếp gọi ngược lại chính nó qua chuỗi sub-agent (đa tầng, ADR-0006 mở rộng).
        """
        visited: set[int] = set()
        queue: list[int] = [sub_agent_id]
        while queue:
            current = queue.pop(0)
            if current == orchestrator_agent_id:
                return True
            if current in visited:
                continue
            visited.add(current)
            children = await self.repo.list_delegations(current)
            queue.extend(d.sub_agent_id for d in children)
        return False
