"""add credential passphrase_ciphertext

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-09-04 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f5a6b7c8d9e0"
down_revision: str | None = "e4f5a6b7c8d9"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Secret phụ cho provider `ssh` (passphrase mở khoá private key, ADR-0022) — NULL cho mọi
    # provider khác (gemini/openai/github không có khái niệm passphrase), không cần backfill.
    op.add_column(
        "credentials", sa.Column("passphrase_ciphertext", sa.LargeBinary(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("credentials", "passphrase_ciphertext")
