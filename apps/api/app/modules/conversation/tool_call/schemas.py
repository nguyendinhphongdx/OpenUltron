from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

ToolCallStatus = Literal["pending", "success", "error"]


class ToolCallCreate(BaseModel):
    tool_name: str
    arguments: dict[str, Any] = {}


class ToolCallComplete(BaseModel):
    status: Literal["success", "error"]
    result: dict[str, Any] | None = None
    error: str | None = None
    latency_seconds: float | None = None


class ToolCallRead(BaseModel):
    id: int
    message_id: int
    tool_name: str
    arguments: dict[str, Any]
    result: dict[str, Any] | None
    status: ToolCallStatus
    started_at: datetime
    ended_at: datetime | None
    latency_seconds: float | None
    error: str | None
