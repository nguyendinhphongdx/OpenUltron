# AGENTS.md — Ultron

> Single source of truth cho mọi coding agent làm việc trong repo. Tuân theo [agents.md](https://agents.md) standard.
>
> `CLAUDE.md` chỉ là pointer sang file này — không có content riêng.

## Repo là gì

- **Tên**: `ultron` — personal AI agent platform (API + web + mobile + desktop).
- **Loại**: Monorepo — `apps/api` là project **Python** (FastAPI + LangGraph), `apps/web`/`apps/mobile`/`apps/desktop` là TypeScript (pnpm workspace + turbo).
- **QUAN TRỌNG — không phụ thuộc OpenJarvis**: Ultron **tự viết toàn bộ code** (tool, connector, MCP client, agent execution). [OpenJarvis](../OpenJarvis) chỉ dùng làm **tài liệu tham khảo** khi thiết kế — KHÔNG import package, KHÔNG gọi sang process/service của nó. Xem [ADR-0001](docs/adr/0001-single-python-runtime.md).
- **Trạng thái**: Scaffold ban đầu — `apps/api` có skeleton (conversation/message/tool_call + health), chưa có agent graph/tool thật, chưa có `web`/`mobile`/`desktop`. Xem [docs/roadmap/](docs/roadmap/).
- **`apps/api`**: Python ≥ 3.11, **uv** làm package manager (KHÔNG pip/poetry trực tiếp).
- **`apps/web`/`mobile`/`desktop`**: Node ≥ 22, **pnpm** (KHÔNG npm/yarn).
- **Stack đã chốt**: FastAPI + SQLAlchemy 2.0 + Alembic ([ADR-0002](docs/adr/0002-orm-sqlalchemy.md)), **PostgreSQL + pgvector** ([ADR-0003](docs/adr/0003-db-postgres-pgvector.md)), Pydantic v2 ([ADR-0004](docs/adr/0004-validation-pydantic.md)), **LangGraph** cho agent execution ([ADR-0005](docs/adr/0005-langgraph-agent-execution.md)). Web: Next.js. Mobile: Expo/React Native. Desktop: Tauri.

## Layout

```text
apps/
  api/                # FastAPI + LangGraph (Python, uv) — conversation/message/tool_call + agent graph
  web/                # (chưa scaffold) Next.js
  mobile/             # (chưa scaffold) Expo
  desktop/            # (chưa scaffold) Tauri
docs/
  adr/                # Architecture Decision Records
  conventions/        # Convention canonical per app
  domain/             # Domain model (Conversation/Message/ToolCall)
  roadmap/            # Progress board — đọc đầu mỗi session
```

## Đọc gì trước khi làm

| Loại câu hỏi                          | Đọc ở đâu                                                      |
| -------------------------------------- | --------------------------------------------------------------- |
| Tiến độ / đang làm gì / làm tiếp gì   | [docs/roadmap/](docs/roadmap/) ← **đọc đầu tiên mỗi session**   |
| Domain model (Conversation/Message/ToolCall) | [docs/domain/](docs/domain/)                              |
| Convention FastAPI (`apps/api`)        | [docs/conventions/01-backend-fastapi.md](docs/conventions/01-backend-fastapi.md) |
| Quyết định kiến trúc / "tại sao chọn X"| [docs/adr/](docs/adr/)                                          |

> **Đừng đoán từ kiến thức FastAPI/NestJS chung** khi đã có ADR/convention quyết định khác. Chưa có decision → hỏi / propose ADR.

## Conventions

- **`apps/api`**: `uv`, Pydantic v2 ([ADR-0004](docs/adr/0004-validation-pydantic.md)), SQLAlchemy + Alembic ([ADR-0002](docs/adr/0002-orm-sqlalchemy.md)), Postgres+pgvector ([ADR-0003](docs/adr/0003-db-postgres-pgvector.md)).
- **`apps/web`/`mobile`/`desktop`**: pnpm, TypeScript.
- **Commit**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`).

## Quy tắc cứng

1. **Không import/gọi OpenJarvis runtime**. Chỉ đọc code OpenJarvis làm tham khảo khi thiết kế — vi phạm rule này → sửa lại theo [ADR-0001](docs/adr/0001-single-python-runtime.md).
2. **Không implement vượt scope yêu cầu**. Chưa có spec/decision → hỏi / propose ADR.
3. **Quyết định kiến trúc → ghi ADR trước khi code** (đổi ORM/DB/lib lớn/thêm multi-tenant...).
4. **Convention canonical thắng kiến thức chung**. Đụng convention sai → sửa ADR/convention trước, không code lệch.
5. **Không bao giờ commit secret** — `.env` đã gitignore, double-check staged.
6. **Ultron là công cụ 1 người dùng** — không thêm multi-tenant/workspace/RBAC nếu chưa có ADR quyết định khác.

## Commands

```bash
cd apps/api
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py
uv run pytest
```

## Harness — convention được enforce tự động, không dựa vào AI nhớ

Đừng chỉ đọc AGENTS.md rồi tự giác — các rule quan trọng đã được gắn vào tooling, chạy được bất kể
session nào đang code:

- `apps/api/scripts/check_module_boundaries.py` — fail nếu `service.py` module A import
  `repository` của module B (rule "Service không import repository của module khác" trong
  [docs/conventions/01-backend-fastapi.md](docs/conventions/01-backend-fastapi.md)). Chạy:
  `cd apps/api && uv run python scripts/check_module_boundaries.py`.
- `.pre-commit-config.yaml` (repo root) — ruff check/format + module boundary guard (`apps/api`),
  lint + typecheck (`apps/web`) chạy trước mỗi commit. Cài 1 lần: `pre-commit install`.
- `.github/workflows/ci.yml` — backstop khi hook không chạy (chưa cài, `--no-verify`, máy khác):
  cùng bộ check trên mỗi push/PR.

Thêm rule cứng mới → ưu tiên viết thành 1 check tự động (script/lint rule/CI job) thay vì chỉ thêm
dòng vào file này.

## Claude Code trong repo này (`.claude/`)

- **Skill `ultron-conventions`** — nạp bảng "đọc gì trước khi làm" + rule cứng + layering
  `apps/api` vào context. Tự trigger khi task liên quan module/endpoint/entity/dependency mới;
  gọi tay qua `Skill` nếu cần chắc chắn.
- **Subagent `api-reviewer`** — review diff `apps/api` theo đúng convention/ADR của repo này
  (không phải review Python chung chung), chạy hộ ruff/format/module-boundary/pytest.
- **Subagent `web-reviewer`** — review diff `apps/web` theo
  [`docs/conventions/02-frontend-nextjs.md`](docs/conventions/02-frontend-nextjs.md) (feature-folder
  layering, type khớp schema BE, không hardcode URL/env), chạy hộ lint/typecheck/build.
- **Subagent `adr-writer`** — soạn ADR mới đúng format/numbering hiện có khi có quyết định kiến
  trúc (rule 3).
- **Slash command `/check`** — chạy nguyên bộ check (giống pre-commit/CI) và báo pass/fail.
- **Slash command `/new-module <name> <purpose>`** — scaffold 1 module `apps/api` đúng layering
  (model/schema/repository/service/router/deps), nhắc migration + đăng ký router.
- **Slash command `/new-adr <mô tả>`** — giao cho `adr-writer` soạn ADR mới.
- `.claude/settings.json` — allowlist sẵn các lệnh đọc/check an toàn (ruff, pytest, lint, git
  read-only) để đỡ prompt permission lặp lại mỗi session.
