# Ultron

Personal AI agent platform — API + web + mobile + desktop. Tự viết toàn bộ runtime (agent
execution, tool, connector) — **không phụ thuộc [OpenJarvis](../OpenJarvis)**, chỉ tham khảo pattern
khi thiết kế (xem [ADR-0001](docs/adr/0001-single-python-runtime.md)).

Xem [AGENTS.md](AGENTS.md) cho convention đầy đủ (đây cũng là nội dung [CLAUDE.md](CLAUDE.md) trỏ
tới), [docs/adr/](docs/adr/) cho quyết định kiến trúc, [docs/roadmap/](docs/roadmap/) cho tiến độ —
đọc roadmap đầu mỗi session.

## Stack

- `apps/api` — Python ≥ 3.11, **uv**, FastAPI + SQLAlchemy 2.0 + Alembic, Postgres + pgvector,
  Pydantic v2, LangGraph (agent execution).
- `apps/web` — Node ≥ 22, **pnpm**, Next.js 15 + React 19 + Tailwind v4.
- `apps/mobile` / `apps/desktop` — chưa scaffold (Expo / Tauri, xem roadmap).

## Quick start

```bash
# Cài dependency cho toàn workspace (web/mobile/desktop) — làm trước tiên
pnpm install

# Infra (Postgres + pgvector)
pnpm dev:infra

# API — dependency Python riêng, không nằm trong `pnpm install` ở trên
cd apps/api
uv sync
cp .env.example .env   # sửa DATABASE_URL/API key nếu cần
uv run alembic upgrade head
uv run fastapi dev app/main.py   # http://localhost:8000, docs ở /docs

# Web (terminal khác, từ root)
pnpm --filter @ultron/web dev
```

## Trước khi commit

Repo có harness tự động — chạy 1 lần `pre-commit install` để mọi commit tự qua ruff
check/format, module-boundary guard (`apps/api`), lint/typecheck (`apps/web`). CI
(`.github/workflows/ci.yml`) chạy lại cùng bộ check này trên mỗi PR. Chi tiết ở mục "Harness"
trong [AGENTS.md](AGENTS.md).
