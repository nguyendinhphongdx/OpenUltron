# Convention — Backend FastAPI (`apps/api`)

> Canonical convention cho code trong `apps/api/app/`. Tinh thần giống convention NestJS ở `muong-kho-api` (module = router + service + repository + schema), chuyển sang Python.
> ORM = **SQLAlchemy 2.0 + Alembic** ([ADR-0002](../adr/0002-orm-sqlalchemy.md)). DB = **PostgreSQL + pgvector** ([ADR-0003](../adr/0003-db-postgres-pgvector.md)). Agent execution = **LangGraph** ([ADR-0005](../adr/0005-langgraph-agent-execution.md)).

## Folder layout

```text
apps/api/
├── app/
│   ├── main.py                  # Bootstrap FastAPI app, include routers
│   ├── core/
│   │   ├── config.py             # Pydantic Settings (env)
│   │   └── errors.py             # Exception handler chuẩn hoá response
│   ├── db/
│   │   ├── base.py               # Declarative Base
│   │   └── session.py            # engine + get_session() dependency
│   └── modules/
│       └── conversation/         # Aggregate root: conversation + message + tool_call
│           ├── models.py          # SQLAlchemy model
│           ├── schemas.py          # Pydantic schema (Create/Update/Read)
│           ├── repository.py       # Query DB, không business logic
│           ├── service.py          # Business logic, throw HTTPException
│           ├── router.py           # FastAPI router — chỉ điều phối HTTP ↔ service
│           ├── message/            # Sub-resource — nested route dưới conversation
│           │   ├── models.py, schemas.py, repository.py, service.py, router.py
│           └── tool_call/          # Sub-resource — nested route dưới message
│               ├── models.py, schemas.py, repository.py, service.py, router.py
│       └── agent/                 # CRUD Agent (org chart, ADR-0006) — KHÔNG chứa LangGraph
│       └── chat/                  # LangGraph — KHÔNG import OpenJarvis (ADR-0001)
│           ├── graph.py             # Graph definition (langchain.agents.create_agent, tool call_agent)
│           └── service.py           # Chạy 1 turn: resolve agent/model, gọi graph, lưu message
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── pyproject.toml                 # uv
└── tests/
```

## Router (~ Controller)

- Chỉ điều phối HTTP ↔ service. **KHÔNG** business logic.
- Route prefix số nhiều: `@router.post("/conversations")`.
- Response model khai rõ qua `response_model=` hoặc return type annotation.

## Service

- Chứa business logic. Nhận `repository` qua constructor/dependency, không tự mở session.
- Raise `HTTPException` (hoặc subclass domain exception) khi lỗi — không trả raw dict lỗi.
- Không import repository của module khác — gọi qua service đã export.

## Repository

- Chỉ query (SQLAlchemy `select`/`insert`/`update`), không business logic, không raise `HTTPException` (raise domain exception nếu cần, service convert sang HTTP).

## Schema (Pydantic)

- `schemas.py`: `<Feature>Create`, `<Feature>Update` (field optional, tương đương `.partial()`), `<Feature>Read` (response).
- `Update` là `BaseModel` riêng (không kế thừa `Create`) với field optional — tránh kéo theo field bất biến của
  Create (vd `slug`) hoặc field bắt buộc không hợp lý khi update từng phần. Đọc `exclude_unset=True` khi apply.

## Persistence — SQLAlchemy + Alembic

- Model kế thừa `Base` chung (`app/db/base.py`).
- Session qua dependency `get_session()` (`app/db/session.py`) — không tạo session rải rác.
- Migration: `uv run alembic revision --autogenerate -m "<desc>"`, `uv run alembic upgrade head`.
- Cột JSON (`metadata`, `arguments`, `result`) dùng `JSONB` (Postgres native, KHÔNG cần tự `json.dumps`/`loads` như SQLite).
- Cột embedding (RAG) dùng `Vector` (`pgvector.sqlalchemy.Vector`).

## Error handling

- Raise `HTTPException(status_code=..., detail=...)` từ service.
- 1 exception handler chung ở `app/core/errors.py` chuẩn hoá response: `{status_code, error, message, timestamp, path}`.

## Agent execution (LangGraph)

- `app/modules/agent/` = CRUD Agent + `AgentDelegation` (org chart, [ADR-0006](../adr/0006-multi-agent-org-chart.md)) — không chứa LangGraph.
- `app/modules/chat/` = LangGraph thật (`graph.py` dùng `create_react_agent`, `service.py` chạy 1 turn) — xem [ADR-0005](../adr/0005-langgraph-agent-execution.md).
- **KHÔNG** `import openjarvis` — tool tự viết, tham khảo pattern (không copy code) từ OpenJarvis khi cần.
- Checkpoint qua Postgres (cùng DB, [ADR-0003](../adr/0003-db-postgres-pgvector.md)) — chưa làm, xem roadmap.

## Naming

| Loại          | Quy ước       | Ví dụ                     |
| ------------- | ------------- | -------------------------- |
| File          | snake_case    | `tool_call.py`             |
| Class         | PascalCase    | `ConversationService`      |
| Module folder | singular snake| `modules/conversation/`    |
| Route path    | plural        | `/conversations`           |
| Var / function| snake_case    | `find_by_channel`          |
| DB column     | snake_case    | `external_user_id`         |
| Env var       | UPPER_SNAKE   | `DATABASE_URL`              |

## Anti-pattern

- ❌ Business logic trong router.
- ❌ `import openjarvis` hoặc gọi sang service OpenJarvis (vi phạm ADR-0001).
- ❌ Tạo session SQLAlchemy rải rác thay vì dependency `get_session()`.
- ❌ Đổi DB/ORM/agent-framework mà không có ADR.

## Self-check trước khi xong

- [ ] Router không chứa business logic?
- [ ] Schema Pydantic validate input, không duplicate field?
- [ ] Không có `import openjarvis` ở đâu?
- [ ] `uv run pytest` xanh, `alembic upgrade head` chạy được?
- [ ] Quyết định kiến trúc mới → có ADR?
