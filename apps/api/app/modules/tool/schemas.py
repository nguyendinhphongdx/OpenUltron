from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

ToolKind = Literal["builtin", "mcp", "http"]


class ToolCreate(BaseModel):
    slug: str
    name: str
    description: str | None = None
    kind: ToolKind = "builtin"
    config: dict[str, Any] | None = None


class ToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    kind: ToolKind | None = None
    config: dict[str, Any] | None = None


class ToolRead(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    kind: ToolKind
    config: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class AgentToolCreate(BaseModel):
    tool_id: int
