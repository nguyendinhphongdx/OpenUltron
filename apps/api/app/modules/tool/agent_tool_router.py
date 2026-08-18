from fastapi import APIRouter, status

from app.modules.tool.deps import ToolServiceDep
from app.modules.tool.schemas import AgentToolCreate, ToolRead

router = APIRouter(prefix="/agents/{agent_id}/tools", tags=["agent-tools"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def assign_tool(agent_id: int, body: AgentToolCreate, service: ToolServiceDep) -> None:
    await service.assign_to_agent(agent_id, body.tool_id)


@router.get("", response_model=list[ToolRead])
async def list_agent_tools(agent_id: int, service: ToolServiceDep) -> list[ToolRead]:
    return await service.list_for_agent(agent_id)


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_tool(agent_id: int, tool_id: int, service: ToolServiceDep) -> None:
    await service.unassign_from_agent(agent_id, tool_id)
