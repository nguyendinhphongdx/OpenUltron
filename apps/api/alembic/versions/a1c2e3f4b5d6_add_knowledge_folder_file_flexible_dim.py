"""add knowledge_folders/knowledge_files, flexible embedding dimension

Revision ID: a1c2e3f4b5d6
Revises: 76ef965dd961
Create Date: 2026-08-19 10:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'a1c2e3f4b5d6'
down_revision: str | None = '76ef965dd961'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'knowledge_folders',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('kb_id', sa.Integer(), nullable=False),
        sa.Column('parent_folder_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['kb_id'], ['knowledge_bases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_folder_id'], ['knowledge_folders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('kb_id', 'parent_folder_id', 'name'),
    )
    op.create_index(op.f('ix_knowledge_folders_kb_id'), 'knowledge_folders', ['kb_id'], unique=False)
    op.create_index(
        op.f('ix_knowledge_folders_parent_folder_id'),
        'knowledge_folders',
        ['parent_folder_id'],
        unique=False,
    )

    op.create_table(
        'knowledge_files',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('kb_id', sa.Integer(), nullable=False),
        sa.Column('folder_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['kb_id'], ['knowledge_bases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['folder_id'], ['knowledge_folders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_knowledge_files_kb_id'), 'knowledge_files', ['kb_id'], unique=False)
    op.create_index(
        op.f('ix_knowledge_files_folder_id'), 'knowledge_files', ['folder_id'], unique=False
    )

    op.add_column('knowledge_chunks', sa.Column('file_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        None, 'knowledge_chunks', 'knowledge_files', ['file_id'], ['id'], ondelete='CASCADE'
    )
    op.create_index(
        op.f('ix_knowledge_chunks_file_id'), 'knowledge_chunks', ['file_id'], unique=False
    )

    # Bỏ dimension cứng 768 — mỗi KB có embedding_model_id cố định nên vẫn nhất quán dimension
    # trong thực tế, nhưng cột không còn chặn KB khác dùng model embedding dimension khác.
    op.execute("ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector USING embedding")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(768) USING embedding"
    )
    op.drop_index(op.f('ix_knowledge_chunks_file_id'), table_name='knowledge_chunks')
    op.drop_constraint(None, 'knowledge_chunks', type_='foreignkey')
    op.drop_column('knowledge_chunks', 'file_id')

    op.drop_index(op.f('ix_knowledge_files_folder_id'), table_name='knowledge_files')
    op.drop_index(op.f('ix_knowledge_files_kb_id'), table_name='knowledge_files')
    op.drop_table('knowledge_files')

    op.drop_index(op.f('ix_knowledge_folders_parent_folder_id'), table_name='knowledge_folders')
    op.drop_index(op.f('ix_knowledge_folders_kb_id'), table_name='knowledge_folders')
    op.drop_table('knowledge_folders')
