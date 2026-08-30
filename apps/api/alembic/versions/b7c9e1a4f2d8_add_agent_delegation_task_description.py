"""add agent_delegation task_description

Revision ID: b7c9e1a4f2d8
Revises: f1a2b3c4d5e6
Create Date: 2026-08-30 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b7c9e1a4f2d8"
down_revision: str | None = "f1a2b3c4d5e6"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "agent_delegations",
        sa.Column("task_description", sa.String(length=1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("agent_delegations", "task_description")
