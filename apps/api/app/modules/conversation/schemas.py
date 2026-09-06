from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ConversationCreate(BaseModel):
    channel: str
    external_user_id: str | None = None
    agent_id: int | None = None
    title: str | None = None
    metadata: dict[str, Any] | None = None


class ConversationUpdate(BaseModel):
    channel: str | None = None
    external_user_id: str | None = None
    agent_id: int | None = None
    title: str | None = None
    pinned: bool | None = None
    archived_at: datetime | None = None
    metadata: dict[str, Any] | None = None


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel: str
    external_user_id: str | None
    agent_id: int | None
    title: str | None
    pinned: bool
    archived_at: datetime | None
    metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
