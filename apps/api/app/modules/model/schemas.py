from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

Provider = Literal["ollama", "gemini", "openai"]


class ModelCreate(BaseModel):
    slug: str
    name: str
    provider: Provider
    model_id: str
    base_url: str | None = None
    is_embedding: bool = False
    extra_config: dict[str, Any] | None = None


class ModelUpdate(BaseModel):
    name: str | None = None
    provider: Provider | None = None
    model_id: str | None = None
    base_url: str | None = None
    is_embedding: bool | None = None
    extra_config: dict[str, Any] | None = None


class ModelRead(BaseModel):
    id: int
    slug: str
    name: str
    provider: Provider
    model_id: str
    base_url: str | None
    is_embedding: bool
    extra_config: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
