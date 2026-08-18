from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(String(500))
    system_prompt: Mapped[str] = mapped_column()
    model_id: Mapped[int] = mapped_column(ForeignKey("models.id"))
    is_orchestrator: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AgentDelegation(Base):
    """Quan hệ many-to-many orchestrator -> sub-agent (ADR-0006 — org chart, không phải tree)."""

    __tablename__ = "agent_delegations"
    __table_args__ = (UniqueConstraint("orchestrator_agent_id", "sub_agent_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    orchestrator_agent_id: Mapped[int] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), index=True
    )
    sub_agent_id: Mapped[int] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), index=True
    )

    orchestrator: Mapped[Agent] = relationship(foreign_keys=[orchestrator_agent_id])
    sub_agent: Mapped[Agent] = relationship(foreign_keys=[sub_agent_id])
