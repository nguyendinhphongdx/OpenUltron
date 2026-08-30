# AGENTS.md — Ultron

> Single source of truth cho mọi coding agent làm việc trong repo. Tuân theo [agents.md](https://agents.md) standard.
>
> `CLAUDE.md` chỉ là pointer sang file này — không có content riêng.

## Repo là gì

- **Tên**: `ultron` — personal AI agent platform (API + web + mobile + desktop).
- **Loại**: Monorepo — `apps/api` là project **Python** (FastAPI + LangGraph), `apps/web`/`apps/mobile`/`apps/desktop` là TypeScript (pnpm workspace + turbo).
- **QUAN TRỌNG — không phụ thuộc OpenJarvis**: Ultron **tự viết toàn bộ code** (tool, connector, MCP client, agent execution). [OpenJarvis](../OpenJarvis) chỉ dùng làm **tài liệu tham khảo** khi thiết kế — KHÔNG import package, KHÔNG gọi sang process/service của nó. Xem [ADR-0001](docs/adr/0001-single-python-runtime.md).
- **Trạng thái**: `apps/api` có conversation/message/tool_call + agent org-chart (1 tầng) + model/tool/knowledge_base/settings; `apps/web` có scaffold Next.js (chưa full feature). `mobile`/`desktop` chưa scaffold. Xem [docs/roadmap/](docs/roadmap/) (mục "Tầm nhìn sản phẩm" cho toàn cảnh feature dự kiến).
- **`apps/api`**: Python ≥ 3.11, **uv** làm package manager (KHÔNG pip/poetry trực tiếp).
- **`apps/web`/`mobile`/`desktop`**: Node ≥ 22, **pnpm** (KHÔNG npm/yarn).
- **Stack đã chốt**: FastAPI + SQLAlchemy 2.0 + Alembic ([ADR-0002](docs/adr/0002-orm-sqlalchemy.md)), **PostgreSQL + pgvector** ([ADR-0003](docs/adr/0003-db-postgres-pgvector.md)), Pydantic v2 ([ADR-0004](docs/adr/0004-validation-pydantic.md)), **LangGraph** cho agent execution ([ADR-0005](docs/adr/0005-langgraph-agent-execution.md)). Web: Next.js. Mobile: Expo/React Native. Desktop: Tauri.

## Layout

```text
apps/
  api/                # FastAPI + LangGraph (Python, uv) — conversation/message/tool_call + agent graph
  web/                # Next.js scaffold — feature conversation, chưa full
  mobile/             # (chưa scaffold) Expo
  desktop/            # (chưa scaffold) Tauri
docs/
  adr/                # Architecture Decision Records (_template.md = nguồn copy khi soạn ADR mới)
  conventions/        # Convention canonical per app
  domain/             # Domain model (Conversation/Message/ToolCall)
  features/           # Feature spec viết TRƯỚC khi code (_template.md = nguồn copy)
  roadmap/            # Progress board + tầm nhìn sản phẩm — đọc đầu mỗi session
```

## Đọc gì trước khi làm

| Loại câu hỏi                          | Đọc ở đâu                                                      |
| -------------------------------------- | --------------------------------------------------------------- |
| Tiến độ / đang làm gì / làm tiếp gì   | [docs/roadmap/](docs/roadmap/) ← **đọc đầu tiên mỗi session**   |
| Domain model (Conversation/Message/ToolCall) | [docs/domain/](docs/domain/)                              |
| Convention FastAPI (`apps/api`)        | [docs/conventions/01-backend-fastapi.md](docs/conventions/01-backend-fastapi.md) |
| Convention Next.js (`apps/web`)        | [docs/conventions/02-frontend-nextjs.md](docs/conventions/02-frontend-nextjs.md) |
| Testing (`apps/api` + `apps/web`)      | [docs/conventions/03-testing.md](docs/conventions/03-testing.md) |
| Error handling (code/exception)        | [docs/conventions/04-error-handling.md](docs/conventions/04-error-handling.md) |
| Naming (casing, wire format, glossary) | [docs/conventions/05-naming.md](docs/conventions/05-naming.md) |
| Security (secret, input/output, tool)  | [docs/conventions/06-security.md](docs/conventions/06-security.md) |
| Logging/Observability (`apps/api`)     | [docs/conventions/07-logging-observability.md](docs/conventions/07-logging-observability.md) |
| Review checklist (severity 🔴🟡🟢)     | [docs/conventions/08-code-review.md](docs/conventions/08-code-review.md) |
| UI visual design (`apps/web`)          | [docs/conventions/09-ui-visual-design.md](docs/conventions/09-ui-visual-design.md) |
| 1 feature/module đã "xong" thật chưa (audit toàn diện, không chỉ diff) | [docs/conventions/10-module-completeness.md](docs/conventions/10-module-completeness.md), skill `module-review` |
| Quyết định kiến trúc / "tại sao chọn X"| [docs/adr/](docs/adr/)                                          |
| Thiết kế tính năng mới / chốt scope trước khi code | [docs/features/](docs/features/) — viết bằng skill `feature-spec` / `/spec`, xem [docs/roadmap/README.md](docs/roadmap/README.md) mục "Tầm nhìn sản phẩm" trước |

> **Đừng đoán từ kiến thức FastAPI/NestJS chung** khi đã có ADR/convention quyết định khác. Chưa có decision → hỏi / propose ADR.

## Conventions

- **`apps/api`**: `uv`, Pydantic v2 ([ADR-0004](docs/adr/0004-validation-pydantic.md)), SQLAlchemy + Alembic ([ADR-0002](docs/adr/0002-orm-sqlalchemy.md)), Postgres+pgvector ([ADR-0003](docs/adr/0003-db-postgres-pgvector.md)).
- **`apps/web`/`mobile`/`desktop`**: pnpm, TypeScript. UI visual direction mặc định là
  [Soft Glass Workspace Console](docs/conventions/09-ui-visual-design.md) — chat-first AI workspace,
  không generic admin dashboard.
- **Commit**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`).

## Quy tắc cứng

1. **Không import/gọi OpenJarvis runtime**. Chỉ đọc code OpenJarvis làm tham khảo khi thiết kế — vi phạm rule này → sửa lại theo [ADR-0001](docs/adr/0001-single-python-runtime.md).
2. **Không implement vượt scope yêu cầu**. Chưa có spec/decision → hỏi / propose ADR.
3. **Quyết định kiến trúc → ghi ADR trước khi code** (đổi ORM/DB/lib lớn/thêm multi-tenant...).
4. **Convention canonical thắng kiến thức chung**. Đụng convention sai → sửa ADR/convention trước,
   không code lệch. Convention **chưa cover** case đang làm → đề xuất bổ sung convention (nói rõ
   đề xuất, chờ đồng ý) rồi mới code — không tự nghĩ ra pattern riêng rồi làm cho có, sau không ai
   maintain. **`docs/` là nguồn tri thức duy nhất** cho rule/pattern/checklist — subagent/skill
   chỉ *trỏ tới* doc tương ứng (link + tên mục), KHÔNG liệt kê lại nội dung rule trong prompt của
   mình. Sửa 1 rule → sửa đúng 1 chỗ trong `docs/`, không phải lục từng file `.claude/agents/*.md`.
5. **Không bao giờ commit secret** — `.env` đã gitignore, double-check staged.
6. **Ultron là công cụ 1 người dùng** — không thêm multi-tenant/workspace/RBAC nếu chưa có ADR quyết định khác.

## Setup (1 lần sau clone/checkout máy mới)

```bash
pre-commit install   # bắt buộc — thiếu bước này thì .pre-commit-config.yaml chỉ nằm chết trong repo,
                      # không hook nào chạy (bug thật đã xảy ra: 1 commit gãy typecheck lọt qua vì
                      # bước này chưa từng chạy). Nếu máy không cài được `pre-commit` CLI (lỗi mạng/SSL
                      # với PyPI), fallback: copy logic check trong .pre-commit-config.yaml thành
                      # .git/hooks/pre-commit (bash, +x) chạy trực tiếp — không phụ thuộc CLI ngoài.
```

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
- `.claude/hooks/session-start.mjs` (wired qua `hooks.SessionStart` trong `.claude/settings.json`) —
  đầu mỗi session nhắc: task không nhỏ → viết/đọc `docs/features/<slug>.md` trước khi code; quyết
  định kiến trúc → ADR trước. Soft nudge (không block), nhưng khiến rule 2/3 "dính" thay vì chỉ nằm
  trong file này chờ model tự nhớ.

Thêm rule cứng mới → phân biệt 2 loại:
- **Invariant cấu trúc/topology** (đúng/sai rõ ràng bằng máy, không cần ngữ cảnh — vd "service
  không import repository module khác") → viết 1 script mới kiểu `check_module_boundaries.py`,
  wire vào pre-commit + CI.
- **Rule mang tính pattern/judgment** (naming, đã có doc chưa, pattern nhất quán chưa, code cũ đã
  dọn chưa...) → **không** viết script riêng cho từng rule (dễ phình, không scale) — thêm vào
  checklist skill `module-review`/`code-reviewer` ([08-code-review.md](docs/conventions/08-code-review.md)/
  [10-module-completeness.md](docs/conventions/10-module-completeness.md)) thay vì code mới.

## Claude Code trong repo này (`.claude/`)

- **Skill `ultron-conventions`** — nạp bảng "đọc gì trước khi làm" + rule cứng + layering
  `apps/api` vào context. Tự trigger khi task liên quan module/endpoint/entity/dependency mới;
  gọi tay qua `Skill` nếu cần chắc chắn.

  **Khi nào tự code (main thread) vs giao subagent** — mỗi subagent khởi động không nhớ gì từ
  agent trước, phải tự đọc lại ADR/convention/code liên quan → tốn thời gian thật nếu lạm dụng cho
  việc đã rõ. Mặc định **tự code trực tiếp**, chỉ giao subagent khi rơi vào 1 trong 3 trường hợp:

  1. Việc đụng **security/mã hoá/dữ liệu nhạy cảm** — cần review độc lập (`code-reviewer`), không
     tự vừa viết vừa tự chấm.
  2. Việc **quyết định kiến trúc** (ADR) — cần tách vai đề xuất/duyệt (`adr-writer`,
     `solution-architect`), không tự vừa đề xuất vừa tự quyết.
  3. Việc **quá lớn**, tự làm sẽ tràn context của main thread (nhiều module/file cùng lúc).

  Khi phải giao subagent: **nhồi fact thật vào prompt** (kết quả research, schema thật, quyết định
  đã chốt) thay vì bảo nó "đi đọc file X" — đỡ tốn 1 vòng tự explore. Có việc tiếp theo liên quan
  trực tiếp tới việc agent đó vừa làm (nó đã đọc file, nhớ context) → resume qua `SendMessage` thay
  vì spawn agent mới đọc lại từ đầu.

  **Team đủ vai cho 1 feature không nhỏ** (dùng qua `/dev`, hoặc gọi tay từng subagent):

  | Subagent | Vai | Ranh giới |
  | --- | --- | --- |
  | `business-analyst` | Làm rõ vấn đề + research sản phẩm/thị trường tương tự, viết draft `docs/features/<slug>.md` + `docs/research/<slug>.md` | Không code, không tự chốt kiến trúc |
  | `solution-architect` | Đọc spec đã accepted + ADR + convention, ra plan chi tiết (file path/step/agent chịu trách nhiệm) | Không viết code; thiếu ADR/convention → dừng, đề xuất, không tự quyết |
  | `backend-engineer` | Code `apps/api` đúng [01-backend-fastapi.md](docs/conventions/01-backend-fastapi.md) + ADR | Convention chưa cover case đang làm → đề xuất bổ sung trước, không tự nghĩ pattern riêng |
  | `frontend-engineer` | Code `apps/web` (Next.js/React/shadcn) đúng [02-frontend-nextjs.md](docs/conventions/02-frontend-nextjs.md) | Same rule; không tự viết test suite (đó là `qa-engineer`) |
  | `qa-engineer` | Viết + **chạy thật** test theo Acceptance Criteria của spec (pytest backend, Vitest+Testing Library frontend) | Không sửa code sản phẩm ngoài phạm vi test, không tự relax AC |
  | `code-reviewer` | Review độc lập diff `apps/api`/`apps/web` sau khi engineer code xong (tự phân loại file, áp đúng checklist convention của app đó) | Review only, không tự sửa code |
  | `module-reviewer` | Audit toàn diện 1 feature/module hiện có (FE→BE, không chỉ diff mới) theo rubric [10-module-completeness.md](docs/conventions/10-module-completeness.md) — flow đúng chưa, code cũ còn sót không, tài liệu khớp code chưa, pattern nhất quán chưa, dễ mở rộng không | Review only, không tự sửa code; khác `code-reviewer` ở chỗ audit toàn bộ trạng thái hiện tại, không cần có diff mới |
  | `adr-writer` | Soạn ADR đúng format khi có quyết định kiến trúc (rule 3) | Chỉ viết ADR, không quyết kiến trúc thay user |

  Reviewer (`code-reviewer`/`module-reviewer`) và implementer (`backend-engineer`/`frontend-engineer`)
  là 2 vai khác nhau — implementer không tự review sâu, reviewer không tự sửa code. `qa-engineer`
  đảm bảo có test/test xanh, khác việc reviewer kiểm convention — không thay thế nhau.
- **Skill `feature-spec`** — scaffold `docs/features/<slug>.md` từ `docs/features/_template.md`
  trước khi code 1 feature không nhỏ (UI surface mới, đổi kiến trúc/lưu trữ) — đúng workflow
  "spec trước, code sau". `business-analyst` dùng skill này khi viết draft.
- **Skill `module-review`** (`/module-review <tên feature/module>`) — giao `module-reviewer` audit
  toàn diện 1 feature/module hiện có theo [10-module-completeness.md](docs/conventions/10-module-completeness.md).
  Dùng khi: nghi ngờ 1 module cũ có code chết/lệch convention, trước khi mở rộng thêm 1 module đã
  tồn tại lâu, hoặc định kỳ audit sức khoẻ codebase — khác `/dev` (build feature mới từ đầu) và
  `code-reviewer` (chỉ review diff mới).
- **Slash command `/dev <mô tả task>`** — chạy full flow business-analyst → solution-architect →
  backend/frontend-engineer → qa-engineer → `code-reviewer`, có APPROVE gate giữa mỗi bước. Task
  nhỏ thì tự bỏ qua flow này (xem nội dung command).
- **Slash command `/check`** — chạy nguyên bộ check (giống pre-commit/CI) và báo pass/fail.
- **Slash command `/new-module <name> <purpose>`** — scaffold 1 module `apps/api` đúng layering
  (model/schema/repository/service/router/deps), nhắc migration + đăng ký router.
- **Slash command `/new-adr <mô tả>`** — giao cho `adr-writer` soạn ADR mới.
- **Slash command `/spec <tên feature>`** — gọi skill `feature-spec` để scaffold spec mới.
- `.claude/settings.json` — allowlist sẵn các lệnh đọc/check an toàn (ruff, pytest, lint, git
  read-only) để đỡ prompt permission lặp lại mỗi session.
