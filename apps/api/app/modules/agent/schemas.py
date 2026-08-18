import re
from datetime import datetime

from pydantic import BaseModel, field_validator

SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{1,79}$")


class AgentCreate(BaseModel):
    slug: str
    name: str
    description: str | None = None
    system_prompt: str
    model_id: int
    is_orchestrator: bool = False

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not SLUG_PATTERN.match(v):
            raise ValueError("slug chỉ gồm chữ thường/số/-/_, 2-80 ký tự")
        return v


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    model_id: int | None = None
    is_orchestrator: bool | None = None


class AgentRead(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    system_prompt: str
    model_id: int
    is_orchestrator: bool
    created_at: datetime
    updated_at: datetime


class AgentDelegationCreate(BaseModel):
    sub_agent_id: int


class AgentDelegationRead(BaseModel):
    id: int
    orchestrator_agent_id: int
    sub_agent_id: int
