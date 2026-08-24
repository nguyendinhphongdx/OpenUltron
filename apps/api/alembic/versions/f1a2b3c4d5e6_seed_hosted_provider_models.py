"""seed models table với catalog gemini/openai (ADR-0010)

Model hosted (gemini/openai) không cần base_url/credential riêng — key inherit từ Credential
của provider (ADR-0010). Seed sẵn để AgentForm/Settings/KnowledgeBaseForm chọn được ngay, không
cần user tự tạo Model cho từng model hosted (self-host ollama/sglang vẫn tự tạo vì cần base_url).

Revision ID: f1a2b3c4d5e6
Revises: d31d1bde1c9e
Create Date: 2026-08-23 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'f1a2b3c4d5e6'
down_revision: str | None = 'd31d1bde1c9e'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


# Snapshot tĩnh tại thời điểm viết migration — KHÔNG import app.core.model_catalog (catalog có
# thể đổi sau này, migration phải giữ nguyên nội dung đã áp dụng để lịch sử migration ổn định).
_SEED_MODELS = [
    # ── Gemini 3.x (2026) ──
    ("gemini-3.7-flash", "Gemini 3.7 Flash", "gemini", "gemini-3.7-flash", False),
    ("gemini-3.6-flash", "Gemini 3.6 Flash", "gemini", "gemini-3.6-flash", False),
    ("gemini-3.5-flash", "Gemini 3.5 Flash", "gemini", "gemini-3.5-flash", False),
    ("gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite", "gemini", "gemini-3.5-flash-lite", False),
    ("gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite", "gemini", "gemini-3.1-flash-lite", False),
    ("gemini-3.1-pro-preview", "Gemini 3.1 Pro (Preview)", "gemini", "gemini-3.1-pro-preview", False),
    ("gemini-3-flash-preview", "Gemini 3 Flash (Preview)", "gemini", "gemini-3-flash-preview", False),
    ("gemini-embedding-001", "Gemini Embedding 001", "gemini", "gemini-embedding-001", True),
    # ── Gemini 1.5/2.x (legacy, vẫn dùng được) ──
    ("gemini-1.5-flash", "Gemini 1.5 Flash", "gemini", "gemini-1.5-flash", False),
    ("gemini-1.5-flash-8b", "Gemini 1.5 Flash-8B", "gemini", "gemini-1.5-flash-8b", False),
    ("gemini-1.5-pro", "Gemini 1.5 Pro", "gemini", "gemini-1.5-pro", False),
    ("gemini-2.0-flash", "Gemini 2.0 Flash", "gemini", "gemini-2.0-flash", False),
    ("gemini-2.0-flash-lite", "Gemini 2.0 Flash-Lite", "gemini", "gemini-2.0-flash-lite", False),
    ("gemini-2.5-flash", "Gemini 2.5 Flash", "gemini", "gemini-2.5-flash", False),
    ("gemini-2.5-pro", "Gemini 2.5 Pro", "gemini", "gemini-2.5-pro", False),
    ("gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite", "gemini", "gemini-2.5-flash-lite", False),
    (
        "gemini-2.5-flash-native-audio",
        "Gemini 2.5 Flash Native Audio",
        "gemini",
        "gemini-2.5-flash-native-audio-latest",
        False,
    ),
    ("gemini-text-embedding-004", "Gemini text-embedding-004", "gemini", "text-embedding-004", True),
    # ── OpenAI ──
    ("openai-gpt-3.5-turbo", "GPT-3.5 Turbo", "openai", "gpt-3.5-turbo", False),
    ("openai-gpt-4-turbo", "GPT-4 Turbo", "openai", "gpt-4-turbo", False),
    ("openai-gpt-4o", "GPT-4o", "openai", "gpt-4o", False),
    ("openai-gpt-4o-mini", "GPT-4o mini", "openai", "gpt-4o-mini", False),
    ("openai-o1", "OpenAI o1 (reasoning)", "openai", "o1", False),
    ("openai-o1-mini", "OpenAI o1-mini (reasoning)", "openai", "o1-mini", False),
    ("openai-o3-mini", "OpenAI o3-mini (reasoning)", "openai", "o3-mini", False),
    (
        "openai-text-embedding-3-small",
        "OpenAI text-embedding-3-small",
        "openai",
        "text-embedding-3-small",
        True,
    ),
    (
        "openai-text-embedding-3-large",
        "OpenAI text-embedding-3-large",
        "openai",
        "text-embedding-3-large",
        True,
    ),
]

_models_table = sa.table(
    "models",
    sa.column("slug", sa.String),
    sa.column("name", sa.String),
    sa.column("provider", sa.String),
    sa.column("model_id", sa.String),
    sa.column("is_embedding", sa.Boolean),
)


def upgrade() -> None:
    conn = op.get_bind()
    for slug, name, provider, model_id, is_embedding in _SEED_MODELS:
        exists = conn.execute(
            sa.text("SELECT 1 FROM models WHERE slug = :slug"), {"slug": slug}
        ).first()
        if exists:
            continue
        conn.execute(
            _models_table.insert().values(
                slug=slug,
                name=name,
                provider=provider,
                model_id=model_id,
                is_embedding=is_embedding,
            )
        )


def downgrade() -> None:
    conn = op.get_bind()
    slugs = [row[0] for row in _SEED_MODELS]
    conn.execute(sa.text("DELETE FROM models WHERE slug = ANY(:slugs)"), {"slugs": slugs})
