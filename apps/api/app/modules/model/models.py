from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Model(Base):
    """Provider config (ADR-0007) — agent/knowledge_base tham chiếu qua FK."""

    __tablename__ = "models"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    provider: Mapped[str] = mapped_column(String(30))  # "ollama" | "gemini" | "openai"
    model_id: Mapped[str] = mapped_column(String(150))  # id phía provider, vd "gemini-2.0-flash"
    base_url: Mapped[str | None] = mapped_column(
        String(255)
    )  # chỉ cần cho provider self-host (ollama)
    is_embedding: Mapped[bool] = mapped_column(Boolean, default=False)
    extra_config: Mapped[dict | None] = mapped_column(JSONB().with_variant(JSON, "sqlite"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
