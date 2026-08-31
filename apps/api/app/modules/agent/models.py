from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
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
    # Vị trí node của CHÍNH agent này khi nó là GỐC canvas orchestrator của nó
    # (docs/features/orchestrator-v2.md Phase C) — vị trí khi agent này là node CON của 1
    # orchestrator khác nằm ở `AgentDelegation.pos_x/pos_y` (theo edge, vì 1 sub-agent có thể ở
    # nhiều canvas khác nhau tại vị trí khác nhau).
    pos_x: Mapped[float | None] = mapped_column(Float())
    pos_y: Mapped[float | None] = mapped_column(Float())
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
    # Mô tả nhiệm vụ RIÊNG theo cạnh delegation này (khác `Agent.description` là mô tả CHUNG của
    # agent) — dùng làm `description` của tool `delegate` khi orchestrator này gọi sub-agent này
    # (docs/features/orchestrator-v2.md, Phase B). Nullable — fallback về `Agent.description` rồi
    # default cứng ở `chat/graph.py` khi không set.
    task_description: Mapped[str | None] = mapped_column(String(1000))
    # Vị trí node `sub_agent_id` trong canvas của CHÍNH `orchestrator_agent_id` này
    # (docs/features/orchestrator-v2.md Phase C) — theo edge, không phải theo agent, vì cùng 1
    # sub-agent có thể được nhiều orchestrator khác nhau gọi ở vị trí khác nhau mỗi canvas.
    pos_x: Mapped[float | None] = mapped_column(Float())
    pos_y: Mapped[float | None] = mapped_column(Float())
    # Trace "lần chạy gần nhất" của cạnh này (Phase C, không giữ full history) — ghi bởi
    # `chat/graph.py::_build_sub_agent_tool` mỗi lần orchestrator thật sự gọi sub-agent này.
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_run_output: Mapped[str | None] = mapped_column(Text())
    last_run_error: Mapped[str | None] = mapped_column(Text())
    last_run_duration_ms: Mapped[int | None] = mapped_column(Integer())

    orchestrator: Mapped[Agent] = relationship(foreign_keys=[orchestrator_agent_id])
    sub_agent: Mapped[Agent] = relationship(foreign_keys=[sub_agent_id])
