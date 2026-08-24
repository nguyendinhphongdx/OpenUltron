from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

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


class McpStdioServerConfig(BaseModel):
    transport: Literal["stdio"] = "stdio"
    command: str
    args: list[str] = []


class McpHttpServerConfig(BaseModel):
    transport: Literal["http"] = "http"
    url: str


class McpToolConfig(BaseModel):
    """Contract cho `Tool.config` khi `kind=mcp` (ADR-0017) — 1 `Tool` row = 1 tool cụ thể trên 1
    MCP server cụ thể (`remote_tool_name`). Args schema KHÔNG khai ở đây — `McpToolBuilder` tự
    discover qua `list_tools()` trên MCP server lúc build, không bắt user gõ tay lại như
    `kind=http`."""

    server: McpStdioServerConfig | McpHttpServerConfig = Field(discriminator="transport")
    remote_tool_name: str


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
