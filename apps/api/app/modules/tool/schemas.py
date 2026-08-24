from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

ToolKind = Literal["builtin", "mcp", "http"]


class HttpKeyValue(BaseModel):
    name: str
    value: str


class HttpToolAiParam(BaseModel):
    name: str
    description: str
    type: Literal["string", "number", "boolean", "json"]


class HttpToolRequest(BaseModel):
    method: Literal["GET", "POST", "PUT", "DELETE"]
    url: str
    headers: list[HttpKeyValue] = []
    query: list[HttpKeyValue] = []
    body: dict[str, Any] | None = None  # JSON object, leaf string có thể chứa "{{param}}"


class HttpToolConfig(BaseModel):
    """Contract cho `Tool.config` khi `kind=http` (ADR-0013) — field name khớp UI form
    (`docs/mockups/agent-tool-execution.html`), KHÔNG tự đổi tên."""

    request: HttpToolRequest
    ai_params: list[HttpToolAiParam] = []


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


class BuiltinToolCatalogEntry(BaseModel):
    """1 entry catalog builtin tool (`GET /tools/builtin-catalog`) — nguồn cho UI chọn slug khi
    tạo `Tool` với `kind=builtin` (trước đây form không hiện gì để chọn)."""

    slug: str
    description: str
