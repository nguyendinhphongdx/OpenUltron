from fastapi import APIRouter, status

from app.modules.agent.deps import AgentReadinessServiceDep, AgentServiceDep
from app.modules.agent.schemas import (
    AgentCreate,
    AgentDelegationCreate,
    AgentDelegationDetailRead,
    AgentDelegationRead,
    AgentDelegationUpdate,
    AgentRead,
    AgentReadinessRead,
    AgentUpdate,
)

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
async def create_agent(body: AgentCreate, service: AgentServiceDep) -> AgentRead:
    return await service.create(body)


@router.get("", response_model=list[AgentRead])
async def list_agents(service: AgentServiceDep) -> list[AgentRead]:
    return await service.list()


@router.get("/{agent_id}", response_model=AgentRead)
async def get_agent(agent_id: int, service: AgentServiceDep) -> AgentRead:
    return await service.get(agent_id)


@router.patch("/{agent_id}", response_model=AgentRead)
async def update_agent(agent_id: int, body: AgentUpdate, service: AgentServiceDep) -> AgentRead:
    return await service.update(agent_id, body)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(agent_id: int, service: AgentServiceDep) -> None:
    await service.remove(agent_id)


@router.post(
    "/{agent_id}/delegations",
    response_model=AgentDelegationRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_delegation(
    agent_id: int, body: AgentDelegationCreate, service: AgentServiceDep
) -> AgentDelegationRead:
    """Đăng ký sub-agent cho 1 orchestrator (ADR-0006 — org chart, many-to-many). `task_description`
    (optional) là mô tả nhiệm vụ riêng theo cạnh này (docs/features/orchestrator-v2.md Phase B)."""
    return await service.add_delegation(agent_id, body.sub_agent_id, body.task_description)


@router.patch(
    "/{agent_id}/delegations/{sub_agent_id}",
    response_model=AgentDelegationRead,
)
async def update_delegation(
    agent_id: int, sub_agent_id: int, body: AgentDelegationUpdate, service: AgentServiceDep
) -> AgentDelegationRead:
    return await service.update_delegation(agent_id, sub_agent_id, body.task_description)


@router.delete("/{agent_id}/delegations/{sub_agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_delegation(agent_id: int, sub_agent_id: int, service: AgentServiceDep) -> None:
    await service.remove_delegation(agent_id, sub_agent_id)


@router.get("/{agent_id}/delegations", response_model=list[AgentDelegationDetailRead])
async def list_delegations(
    agent_id: int, service: AgentServiceDep
) -> list[AgentDelegationDetailRead]:
    """Edge + sub-agent lồng đầy đủ (task_description + AgentRead) — dùng bởi canvas edge
    contract panel. Khác `GET /{agent_id}/sub-agents` (chỉ trả `AgentRead` trần, FE đang dùng,
    giữ nguyên)."""
    return await service.list_delegation_details(agent_id)


@router.get("/{agent_id}/sub-agents", response_model=list[AgentRead])
async def list_sub_agents(agent_id: int, service: AgentServiceDep) -> list[AgentRead]:
    return await service.list_sub_agents(agent_id)


@router.get("/{agent_id}/readiness", response_model=AgentReadinessRead)
async def get_agent_readiness(
    agent_id: int, service: AgentReadinessServiceDep
) -> AgentReadinessRead:
    """Readiness check đệ quy toàn bộ agent + sub-agent trong graph
    (docs/features/orchestrator-v2.md Phase B) — credential/model/tool-config/KB rỗng."""
    return await service.check(agent_id)
