from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from pydantic import ValidationError

from app.core.errors import ValidationFailedError
from app.modules.agent.service import AgentService
from app.modules.tool.models import Tool
from app.modules.tool.repository import ToolRepository
from app.modules.tool.schemas import HttpToolConfig, ToolCreate, ToolRead, ToolUpdate


def _validate_config_for_kind(kind: str, config: dict[str, Any] | None) -> None:
    """`kind=http` có contract cố định (`HttpToolConfig`, ADR-0013) — validate ở tầng service vì
    `Tool.config` vẫn là cột JSONB tự do, Pydantic không tự chặn được ở request schema chung cho
    mọi kind."""
    if kind != "http":
        return
    try:
        HttpToolConfig.model_validate(config or {})
    except ValidationError as exc:
        raise ValidationFailedError(f"config không hợp lệ cho tool kind=http: {exc}") from exc


def tool_to_read(row: Tool) -> ToolRead:
    return ToolRead(
        id=row.id,
        slug=row.slug,
        name=row.name,
        description=row.description,
        kind=row.kind,
        config=row.config,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class ToolService:
    def __init__(self, repo: ToolRepository, agent_service: AgentService) -> None:
        self.repo = repo
        self.agent_service = agent_service

    async def create(self, input: ToolCreate) -> ToolRead:
        if await self.repo.get_by_slug(input.slug) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=f"Tool slug '{input.slug}' đã tồn tại"
            )
        _validate_config_for_kind(input.kind, input.config)
        row = await self.repo.create(**input.model_dump())
        return tool_to_read(row)

    async def list(self) -> list[ToolRead]:
        return [tool_to_read(r) for r in await self.repo.list()]

    async def get_or_404(self, tool_id: int) -> Tool:
        row = await self.repo.get(tool_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Tool {tool_id} không tồn tại"
            )
        return row

    async def get(self, tool_id: int) -> ToolRead:
        return tool_to_read(await self.get_or_404(tool_id))

    async def update(self, tool_id: int, input: ToolUpdate) -> ToolRead:
        row = await self.get_or_404(tool_id)
        for field, value in input.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        # Validate dựa trên state cuối cùng của row (không phải `input` riêng) — request có thể
        # chỉ đổi `config` mà không đổi `kind`, hoặc ngược lại.
        _validate_config_for_kind(row.kind, row.config)
        return tool_to_read(row)

    async def remove(self, tool_id: int) -> None:
        row = await self.get_or_404(tool_id)
        await self.repo.delete(row)

    async def assign_to_agent(self, agent_id: int, tool_id: int) -> None:
        await self.agent_service.get_or_404(agent_id)
        await self.get_or_404(tool_id)
        if await self.repo.get_agent_tool(agent_id, tool_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Agent {agent_id} đã được gán tool {tool_id}",
            )
        await self.repo.add_agent_tool(agent_id, tool_id)

    async def unassign_from_agent(self, agent_id: int, tool_id: int) -> None:
        removed = await self.repo.remove_agent_tool(agent_id, tool_id)
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent {agent_id} chưa được gán tool {tool_id}",
            )

    async def list_for_agent(self, agent_id: int) -> list[ToolRead]:
        return [tool_to_read(r) for r in await self.repo.list_tools_for_agent(agent_id)]
