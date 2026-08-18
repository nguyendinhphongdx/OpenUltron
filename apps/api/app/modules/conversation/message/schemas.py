from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

MessageRole = Literal["system", "user", "assistant", "tool"]


class MessageCreate(BaseModel):
    role: MessageRole
    content: str
    tokens_prompt: int | None = None
    tokens_completion: int | None = None
    cost_usd: float | None = None
    metadata: dict[str, Any] | None = None


class MessageRead(BaseModel):
    id: int
    conversation_id: int
    seq: int
    role: MessageRole
    content: str
    tokens_prompt: int | None
    tokens_completion: int | None
    cost_usd: float | None
    metadata: dict[str, Any] | None = None
    created_at: datetime
