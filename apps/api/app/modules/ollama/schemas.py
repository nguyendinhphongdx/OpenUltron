from pydantic import BaseModel


class OllamaInstalledModel(BaseModel):
    name: str
    size_bytes: int | None = None


class OllamaPullEvent(BaseModel):
    """1 event NDJSON từ Ollama /api/pull, forward gần như nguyên bản qua SSE (ADR-0011)."""

    status: str
    completed: int | None = None
    total: int | None = None
    error: str | None = None
