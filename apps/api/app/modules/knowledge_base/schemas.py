from datetime import datetime
from typing import Any

from pydantic import BaseModel


class KnowledgeBaseCreate(BaseModel):
    slug: str
    name: str
    description: str | None = None
    embedding_model_id: int


class KnowledgeBaseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class KnowledgeBaseRead(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    embedding_model_id: int
    created_at: datetime
    updated_at: datetime


class ChunkCreate(BaseModel):
    content: str
    metadata: dict[str, Any] | None = None


class ChunkRead(BaseModel):
    id: int
    kb_id: int
    content: str
    metadata: dict[str, Any] | None = None
    created_at: datetime


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class SearchResult(BaseModel):
    chunk: ChunkRead
    score: float  # cosine distance — càng nhỏ càng giống (pgvector <=> operator)


class AgentKnowledgeBaseCreate(BaseModel):
    kb_id: int
