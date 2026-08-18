from fastapi import APIRouter, status

from app.modules.agent.deps import AgentServiceDep
from app.modules.agent.schemas import (
    AgentCreate,
    AgentDelegationCreate,
    AgentDelegationRead,
    AgentRead,
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
    """Đăng ký sub-agent cho 1 orchestrator (ADR-0006 — org chart, many-to-many)."""
    return await service.add_delegation(agent_id, body.sub_agent_id)


@router.get("/{agent_id}/sub-agents", response_model=list[AgentRead])
async def list_sub_agents(agent_id: int, service: AgentServiceDep) -> list[AgentRead]:
    return await service.list_sub_agents(agent_id)
