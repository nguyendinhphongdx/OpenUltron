import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, LargeBinary, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Credential(Base):
    """Provider API key mã hoá tại rest (ADR-0010) — 1 credential/provider (unique `provider`)."""

    __tablename__ = "credentials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(
        String(30), unique=True, index=True
    )  # "gemini" | "openai"
    ciphertext: Mapped[bytes] = mapped_column(LargeBinary)  # AES-256-GCM, xem app/core/crypto.py
    is_valid: Mapped[bool] = mapped_column(Boolean, default=False)  # set sau test-connection thật
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
