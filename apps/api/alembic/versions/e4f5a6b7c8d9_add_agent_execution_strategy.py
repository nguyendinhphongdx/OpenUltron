"""add agent execution strategy

Revision ID: e4f5a6b7c8d9
Revises: c2d3e4f5a6b7
Create Date: 2026-09-02 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e4f5a6b7c8d9"
down_revision: str | None = "c2d3e4f5a6b7"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Chiến lược thực thi turn top-level (ADR-0021): "react" | "plan_execute". server_default giữ
    # nguyên hành vi cho agent đã có sẵn, không cần backfill tay.
    op.add_column(
        "agents",
        sa.Column("execution_strategy", sa.String(20), nullable=False, server_default="react"),
    )


def downgrade() -> None:
    op.drop_column("agents", "execution_strategy")
