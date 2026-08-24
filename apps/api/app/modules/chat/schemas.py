from typing import Literal

from pydantic import BaseModel


class ChatRequest(BaseModel):
    content: str


class ApprovalRequest(BaseModel):
    """Duyệt/từ chối 1 tool call đang chờ (approval gate, ADR-0014)."""

    decision: Literal["approve", "reject"]
