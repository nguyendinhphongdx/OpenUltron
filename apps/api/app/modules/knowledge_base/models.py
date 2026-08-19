from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(String(500))
    embedding_model_id: Mapped[int] = mapped_column(ForeignKey("models.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class KnowledgeFolder(Base):
    """Folder nested kiểu Google Drive — `parent_folder_id=None` = folder gốc của KB."""

    __tablename__ = "knowledge_folders"
    __table_args__ = (UniqueConstraint("kb_id", "parent_folder_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    kb_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), index=True
    )
    parent_folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("knowledge_folders.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(150))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class KnowledgeFile(Base):
    """1 file trong KB — `folder_id=None` = nằm ở gốc KB. `status` theo dõi vòng đời chunking
    (đồng bộ trong 1 request `POST .../files/{id}/chunks` ở bản đầu, chưa có job queue riêng)."""

    __tablename__ = "knowledge_files"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    kb_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), index=True
    )
    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("knowledge_folders.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending|chunking|done|error
    error_message: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    kb_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), index=True
    )
    # Nullable — chunk cũ (tạo qua `POST /knowledge-bases/{id}/chunks` trước khi có Folder/File)
    # không gắn file nào; chunk mới qua `POST .../files/{id}/chunks` luôn có file_id.
    file_id: Mapped[int | None] = mapped_column(
        ForeignKey("knowledge_files.id", ondelete="CASCADE"), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    # Không fix dimension cứng nữa (trước là 768, khớp nomic-embed-text) — mỗi KB có
    # embedding_model_id cố định nên chunk trong cùng 1 KB luôn cùng dimension trên thực tế; KB khác
    # dùng model embedding khác dimension (vd Gemini) giờ không còn lỗi ở bản đầu (ADR-0007 mục
    # "Chưa quyết" — multi-dimension embedding).
    embedding: Mapped[list[float]] = mapped_column(Vector())
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB().with_variant(JSON, "sqlite"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AgentKnowledgeBase(Base):
    """Gán KB theo từng agent (ADR-0007) — độc lập với việc agent là orchestrator hay không."""

    __tablename__ = "agent_knowledge_bases"
    __table_args__ = (UniqueConstraint("agent_id", "kb_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), index=True)
    kb_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), index=True
    )
