"""add agent orchestrator layout and delegation trace

Revision ID: c2d3e4f5a6b7
Revises: b7c9e1a4f2d8
Create Date: 2026-08-31 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: str | None = "b7c9e1a4f2d8"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Vị trí node gốc trong canvas của chính nó (docs/features/orchestrator-v2.md Phase C) — node
    # con lưu vị trí ở `agent_delegations` (theo edge, vì 1 sub-agent có thể ở nhiều canvas khác
    # nhau tại vị trí khác nhau).
    op.add_column("agents", sa.Column("pos_x", sa.Float(), nullable=True))
    op.add_column("agents", sa.Column("pos_y", sa.Float(), nullable=True))

    op.add_column("agent_delegations", sa.Column("pos_x", sa.Float(), nullable=True))
    op.add_column("agent_delegations", sa.Column("pos_y", sa.Float(), nullable=True))
    op.add_column(
        "agent_delegations", sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("agent_delegations", sa.Column("last_run_output", sa.Text(), nullable=True))
    op.add_column("agent_delegations", sa.Column("last_run_error", sa.Text(), nullable=True))
    op.add_column(
        "agent_delegations", sa.Column("last_run_duration_ms", sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("agent_delegations", "last_run_duration_ms")
    op.drop_column("agent_delegations", "last_run_error")
    op.drop_column("agent_delegations", "last_run_output")
    op.drop_column("agent_delegations", "last_run_at")
    op.drop_column("agent_delegations", "pos_y")
    op.drop_column("agent_delegations", "pos_x")

    op.drop_column("agents", "pos_y")
    op.drop_column("agents", "pos_x")
