from fastapi import APIRouter, status

from app.modules.tool.builder import BUILTIN_TOOL_CATALOG
from app.modules.tool.deps import ToolServiceDep
from app.modules.tool.schemas import BuiltinToolCatalogEntry, ToolCreate, ToolRead, ToolUpdate

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("", response_model=ToolRead, status_code=status.HTTP_201_CREATED)
async def create_tool(body: ToolCreate, service: ToolServiceDep) -> ToolRead:
    return await service.create(body)


@router.get("", response_model=list[ToolRead])
async def list_tools(service: ToolServiceDep) -> list[ToolRead]:
    return await service.list()


# Khai TRƯỚC `/{tool_id}` — cùng lý do `GET /models/catalog` khai trước `/{model_id}`
# (`model/router.py`): path param int sẽ không match "builtin-catalog" nên thứ tự không bắt
# buộc về mặt kỹ thuật ở đây, nhưng giữ quy ước khai catalog trước cho nhất quán.
@router.get("/builtin-catalog", response_model=list[BuiltinToolCatalogEntry])
async def list_builtin_tool_catalog() -> list[BuiltinToolCatalogEntry]:
    return [
        BuiltinToolCatalogEntry(slug=slug, description=description)
        for slug, description in BUILTIN_TOOL_CATALOG.items()
    ]


@router.get("/{tool_id}", response_model=ToolRead)
async def get_tool(tool_id: int, service: ToolServiceDep) -> ToolRead:
    return await service.get(tool_id)


@router.patch("/{tool_id}", response_model=ToolRead)
async def update_tool(tool_id: int, body: ToolUpdate, service: ToolServiceDep) -> ToolRead:
    return await service.update(tool_id, body)


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(tool_id: int, service: ToolServiceDep) -> None:
    await service.remove(tool_id)
