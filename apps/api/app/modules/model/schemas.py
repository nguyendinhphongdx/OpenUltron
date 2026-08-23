from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

from app.core.model_catalog import ModelCapabilities

Provider = Literal["ollama", "gemini", "openai", "sglang"]


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
    capabilities: ModelCapabilities | None  # catalog tĩnh (ADR-0010), không phải cột DB
    created_at: datetime
    updated_at: datetime
