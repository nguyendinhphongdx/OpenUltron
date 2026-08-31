from __future__ import annotations

from datetime import UTC, datetime

from app.core.errors import ConflictError, ResourceNotFoundError, ValidationFailedError
from app.core.logging import logger
from app.modules.agent.models import Agent, AgentDelegation
from app.modules.agent.repository import AgentRepository
from app.modules.agent.schemas import (
    AgentCreate,
    AgentDelegationDetailRead,
    AgentDelegationRead,
    AgentDelegationUpdate,
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
        pos_x=row.pos_x,
        pos_y=row.pos_y,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def delegation_to_read(row: AgentDelegation) -> AgentDelegationRead:
    return AgentDelegationRead(
        id=row.id,
        orchestrator_agent_id=row.orchestrator_agent_id,
        sub_agent_id=row.sub_agent_id,
        task_description=row.task_description,
        pos_x=row.pos_x,
        pos_y=row.pos_y,
        last_run_at=row.last_run_at,
        last_run_output=row.last_run_output,
        last_run_error=row.last_run_error,
        last_run_duration_ms=row.last_run_duration_ms,
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
        return delegation_to_read(row)

    async def update_delegation(
        self, orchestrator_agent_id: int, sub_agent_id: int, update: AgentDelegationUpdate
    ) -> AgentDelegationRead:
        """Partial update (`exclude_unset`, cùng lối `AgentService.update`) — field không có mặt
        trong request giữ nguyên giá trị cũ. Bắt buộc vì `pos_x`/`pos_y` (kéo node liên tục) và
        `task_description` (sửa qua panel) là 2 nơi gọi độc lập, không thể set thẳng như trước
        (docs/features/orchestrator-v2.md Phase C)."""
        row = await self.repo.get_delegation(orchestrator_agent_id, sub_agent_id)
        if row is None:
            raise ResourceNotFoundError(
                "AgentDelegation", f"{sub_agent_id} (orchestrator_agent_id={orchestrator_agent_id})"
            )
        for field, value in update.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        return delegation_to_read(row)

    async def record_delegation_run(
        self,
        delegation_id: int,
        *,
        output: str | None,
        error: str | None,
        duration_ms: int,
    ) -> None:
        """Ghi "lần chạy gần nhất" của 1 cạnh delegation (Phase C, không giữ full history) — gọi
        từ `chat/graph.py::_build_sub_agent_tool` mỗi lần orchestrator thật sự gọi sub-agent này.
        Internal telemetry, không qua router/user-facing — không tồn tại thì log rồi bỏ qua, KHÔNG
        raise (ghi trace lỗi không được phép làm hỏng turn chat đang chạy)."""
        row = await self.repo.get_delegation_by_id(delegation_id)
        if row is None:
            logger.warning("agent.record_delegation_run_missing", delegation_id=delegation_id)
            return
        row.last_run_at = datetime.now(UTC)
        row.last_run_output = output
        row.last_run_error = error
        row.last_run_duration_ms = duration_ms

    async def list_sub_agents(self, orchestrator_agent_id: int) -> list[AgentRead]:
        return [agent_to_read(r) for r in await self.repo.list_sub_agents(orchestrator_agent_id)]

    async def list_delegation_details(
        self, orchestrator_agent_id: int
    ) -> list[AgentDelegationDetailRead]:
        """Edge + sub-agent lồng — dùng bởi canvas (hiển thị edge contract) và
        `ChatService._resolve_sub_agent_spec` (đọc `task_description` làm mô tả tool `delegate`)."""
        return [
            AgentDelegationDetailRead(
                **delegation_to_read(delegation).model_dump(),
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
