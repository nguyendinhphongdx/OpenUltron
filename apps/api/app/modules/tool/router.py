from fastapi import APIRouter, status

from app.modules.tool.deps import ToolServiceDep
from app.modules.tool.schemas import ToolCreate, ToolRead, ToolUpdate

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("", response_model=ToolRead, status_code=status.HTTP_201_CREATED)
async def create_tool(body: ToolCreate, service: ToolServiceDep) -> ToolRead:
    return await service.create(body)


@router.get("", response_model=list[ToolRead])
async def list_tools(service: ToolServiceDep) -> list[ToolRead]:
    return await service.list()


@router.get("/{tool_id}", response_model=ToolRead)
async def get_tool(tool_id: int, service: ToolServiceDep) -> ToolRead:
    return await service.get(tool_id)


@router.patch("/{tool_id}", response_model=ToolRead)
async def update_tool(tool_id: int, body: ToolUpdate, service: ToolServiceDep) -> ToolRead:
    return await service.update(tool_id, body)


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(tool_id: int, service: ToolServiceDep) -> None:
    await service.remove(tool_id)
