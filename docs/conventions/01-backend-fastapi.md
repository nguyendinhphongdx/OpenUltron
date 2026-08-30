# Convention — Backend FastAPI (`apps/api`)

> Canonical convention cho code trong `apps/api/app/`. Tinh thần giống convention NestJS ở `muong-kho-api` (module = router + service + repository + schema), chuyển sang Python.
> ORM = **SQLAlchemy 2.0 + Alembic** ([ADR-0002](../adr/0002-orm-sqlalchemy.md)). DB = **PostgreSQL + pgvector** ([ADR-0003](../adr/0003-db-postgres-pgvector.md)). Agent execution = **LangGraph** ([ADR-0005](../adr/0005-langgraph-agent-execution.md)).

## Nguyên tắc thiết kế — tránh over-engineering (đọc trước, áp dụng cho MỌI section dưới)

Đây là rule quan trọng nhất của file này. Code AI sinh ra có xu hướng thêm abstraction/pattern
"cho chắc, phòng sau cần" — Ultron là 1 người dùng, codebase phải giữ đủ đơn giản để đọc hiểu trong
1 lần đọc, không phải để show off design pattern.

- **Trừu tượng hoá chỉ khi có ≥ 2 cài đặt THẬT đang tồn tại**, không phải vì "có thể cần sau". Ví
  dụ: `core/providers.py` ban đầu chỉ có 1 việc (build chat model) theo provider, viết bằng if/else
  là đúng — **không** trừu tượng hoá vì "sau có thể cần". Khi số việc lặp theo provider tăng lên
  (build chat model, build embeddings, test credential — ADR-0010/0011) và if/elif y hệt bắt đầu
  lặp lại ở **≥ 2 file khác nhau** (không phải 1 file dài hơn — đó là dấu hiệu khác), đó là "đau
  thật" đúng ngưỡng — chuyển sang 1 `Protocol` `ProviderAdapter` + registry tĩnh
  (`app/core/provider_adapter.py`, [ADR-0012](../adr/0012-provider-adapter-abstraction.md)). Vẫn
  KHÔNG dùng plugin discovery/DI container — chỉ 1 dict thường, thêm provider mới = 1 class + 1
  dòng registry. Ngưỡng để nhớ: **if/else khi 1 chỗ gọi, adapter khi ≥ 2 chỗ gọi cùng logic đó** —
  không phải "có 4 provider thì phải trừu tượng hoá ngay từ đầu".
- **Không tạo class cho pure function không có state.** Hàm module-level (`def foo(x): ...`) là đủ
  — không bọc trong 1 class chỉ để "tổ chức" khi class đó không giữ state gì giữa các lần gọi.
- **Không thêm design pattern (Strategy/Observer/Builder/Factory) khi 1 `if/else` hoặc 1 hàm rõ
  ràng đã giải quyết được.** Nếu thấy mình đang viết `AbstractXxxHandler`/`XxxFactory`/`XxxStrategy`
  cho 1 case chưa có 2 biến thể thật — dừng, viết thẳng.
- **Không tự thêm layer/indirection mới** (ví dụ 1 "manager" đứng giữa router và service, hoặc
  service gọi qua 1 interface trong khi chỉ có 1 implementation) — router → service → repository
  là đủ tầng cho quy mô này (xem "Folder layout" dưới), không thêm tầng thứ 4.
- **Function/method nên đọc hiểu trong 1 lần đọc** — không có rule cứng đếm dòng (số dòng service
  dài nhất thay đổi theo thời gian, không chốt con số cụ thể ở đây để tránh lại lỗi thời); method
  dài hơn ~40-50 dòng hoặc lồng `if` quá 3 cấp là dấu hiệu nên tách hàm con, không phải thêm class.
- **Không viết code "phòng hờ mở rộng"** (tham số chưa ai gọi, field chưa ai dùng, hook điểm mở rộng
  chưa có ca dùng thật) — AGENTS.md rule 2 (không vượt scope). Cần mở rộng thật thì sửa lúc đó,
  không trả giá phức tạp trước khi cần.

## Đọc bức tranh tổng thể trước khi code

Trước khi thêm/sửa 1 module, đọc (không chỉ file định sửa):

1. Toàn bộ 5-6 file của module đó (`models.py`/`schemas.py`/`repository.py`/`service.py`/
   `router.py`/`deps.py`) — biết method/field đã có gì, tránh viết lại.
2. 1 module tương tự đã có (`app/modules/model/` là mẫu CRUD đơn giản nhất) — pattern đã chốt là
   gì, đừng tự nghĩ pattern khác cho case tương tự.
3. `docs/adr/*.md` liên quan + convention chuyên đề liên quan (xem bảng "Đọc gì trước khi làm" ở
   `AGENTS.md`).

## Folder layout

```text
apps/api/
├── app/
│   ├── main.py                  # Bootstrap FastAPI app, include routers
│   ├── core/
│   │   ├── config.py             # Pydantic Settings (env)
│   │   ├── errors.py             # UltronError + exception handler (04-error-handling.md)
│   │   ├── logging.py            # structlog setup (07-logging-observability.md)
│   │   └── providers.py          # Provider if/else — KHÔNG abstract class, xem "Nguyên tắc" trên
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
└── tests/                          # xem 03-testing.md
```

**Module luôn đủ 4 file `models/schemas/repository/service` + `router.py`** — dù module chỉ CRUD
đơn giản không có business rule gì thêm, `service.py` vẫn tồn tại (có thể "mỏng", chỉ gọi thẳng
`repository`) để giữ layering nhất quán — không bỏ layer service "vì lúc này chưa cần gì", tránh
phải đổi chữ ký gọi ở router khi sau này thêm logic thật.

**Ngoại lệ đã biết** (không sở hữu bảng DB riêng → không cần `models.py`/`repository.py`, có ADR
giải thích rõ — KHÔNG phải thiếu sót khi review):

| Module | Thiếu | Lý do |
|---|---|---|
| `chat/` | `models.py`, `repository.py` | LangGraph thật, chạy trên `conversation`/`message` đã có sẵn — không có bảng riêng ([ADR-0005](../adr/0005-langgraph-agent-execution.md)) |
| `ollama/` | `models.py`, `repository.py` | Chỉ proxy Ollama local (catalog + pull SSE), không có state DB riêng ([ADR-0011](../adr/0011-ollama-pull-sse-streaming.md)) |
| `voice/` | `models.py`, `repository.py`, `schemas.py` (thay bằng `contracts.py`) | Relay WebSocket, không sở hữu bảng riêng (dùng `message` để lưu transcript); `contracts.py` chứa dataclass + `Protocol` giao thức, không phải Pydantic response schema thường ([ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md)) |
| `connector/` | `models.py`, `repository.py`, `service.py`, `router.py` | Chỉ `adapter.py` + implementation (vd `github.py`) — mount qua `credential`/`tool`, không có route/CRUD riêng ([ADR-0015](../adr/0015-connector-adapter-abstraction.md)) |

## Router (~ Controller)

- Chỉ điều phối HTTP ↔ service. **KHÔNG** business logic, không transform data phức tạp (đó là
  service/schema).
- Route prefix số nhiều: `@router.post("/conversations")`.
- Response model khai rõ qua `response_model=` hoặc return type annotation.
- 1 route = vài dòng: parse path/query param → gọi 1 method service → return. Route dài hơn ~10
  dòng thân hàm là dấu hiệu có logic lẽ ra thuộc service.

## Service

- Chứa business logic. Nhận `repository` qua constructor/dependency, không tự mở session.
- Raise domain error (`UltronError`/subclass — xem [`04-error-handling.md`](04-error-handling.md)),
  KHÔNG raise `HTTPException` trực tiếp, không trả raw dict lỗi.
- Không import repository của module khác — gọi qua service đã export (constructor nhận
  `<Module>Service`, không nhận `<Module>Repository`) — enforced bằng
  `scripts/check_module_boundaries.py`.
- Method service nên **1 hành động nghiệp vụ = 1 method** (`create`, `delete`, `add_delegation`) —
  không gộp nhiều hành động khác nhau vào 1 method có flag `mode: str` để chọn nhánh.

## Repository

- Chỉ query (SQLAlchemy `select`/`insert`/`update`), không business logic, không raise `HTTPException` (raise domain exception nếu cần, service convert sang HTTP).
- Method đặt tên theo truy vấn thật làm (`find_by_slug`, `list_by_agent_id`) — không đặt tên chung
  `query()`/`get_data()` rồi nhận tham số filter tuỳ ý (khó theo dõi ai gọi gì).

## Schema (Pydantic)

- `schemas.py`: `<Feature>Create`, `<Feature>Update` (field optional, tương đương `.partial()`), `<Feature>Read` (response).
- `Update` là `BaseModel` riêng (không kế thừa `Create`) với field optional — tránh kéo theo field bất biến của
  Create (vd `slug`) hoặc field bắt buộc không hợp lý khi update từng phần. Đọc `exclude_unset=True` khi apply.

## Thiết kế DB

- Mọi bảng có `id` (PK), `created_at`, `updated_at` (đã áp dụng ở mọi module hiện có) — giữ nhất
  quán, không bỏ qua cho bảng "phụ".
- **FK bắt buộc khi quan hệ bắt buộc** — cột FK không nullable khi record không có nghĩa nếu thiếu
  quan hệ đó (ví dụ `Message.conversation_id`); nullable chỉ khi quan hệ thật sự optional.
- **JSON column (`JSONB`) chỉ cho dữ liệu thật sự không có shape cố định** (`Model.extra_config`,
  `ToolCall.arguments`/`result` — khác nhau theo từng tool/provider, không thể định nghĩa cột riêng
  cho từng field). KHÔNG dùng JSON cho dữ liệu có shape rõ, biết trước field gì — cái đó nên là cột
  riêng hoặc bảng riêng (query/index/validate được, JSON thì không).
- **Không tách bảng quá mức** cho mỗi thuộc tính nhỏ (over-normalize) — nhưng cũng không dồn nhiều
  entity khác nhau vào 1 bảng qua cột `type` phân loại (under-normalize, kiểu "bảng thần thánh") —
  1 bảng = 1 khái niệm domain rõ ràng (xem `docs/domain/01-entities.md`).
- Cột embedding dùng `Vector` (`pgvector.sqlalchemy.Vector`), dimension theo model embedding thật
  đang dùng (xem ADR-0007 — không fix cứng 768 nữa, linh hoạt theo `KnowledgeBase`).
- Entity mới → luôn đối chiếu `docs/domain/01-entities.md` trước, cập nhật file đó nếu thêm entity
  thật (không để domain doc lệch code).

## Persistence — SQLAlchemy + Alembic

- Model kế thừa `Base` chung (`app/db/base.py`).
- Session qua dependency `get_session()` (`app/db/session.py`) — không tạo session rải rác.
- Migration: `uv run alembic revision --autogenerate -m "<desc>"`, `uv run alembic upgrade head`.
- Cột JSON (`metadata`, `arguments`, `result`) dùng `JSONB` (Postgres native, KHÔNG cần tự `json.dumps`/`loads` như SQLite).
- Cột embedding (RAG) dùng `Vector` (`pgvector.sqlalchemy.Vector`).

## Modular/swappable component (Protocol + registry)

Pattern chính thức khi 1 concern có nhiều biến thể cần thay/thêm được độc lập, không sửa call site
cũ — đã áp dụng 3 lần trong code thật, formalize lại đây để module mới cùng dạng theo đúng khuôn,
không tự nghĩ cách khác:

- **Khi nào dùng**: đã đạt ngưỡng "≥2 cài đặt thật + if/elif lặp ở ≥2 call site" (xem "Nguyên tắc
  thiết kế" ở đầu file) — KHÔNG dựng registry cho 1 implementation "phòng hờ sau có thêm".
- **Cấu trúc chuẩn**: 1 `Protocol` định nghĩa method chung (`app/core/provider_adapter.py::ProviderAdapter`,
  `app/modules/tool/builder.py::ToolBuilder`, `app/modules/connector/adapter.py::ConnectorAdapter`)
  + 1 `dict` registry tĩnh module-level map key (string cố định, vd `provider`/`kind`/`slug`) →
  implementation. KHÔNG dùng plugin discovery/DI container/entry_points.
- **Thêm 1 implementation mới = 1 class implement `Protocol` + 1 dòng thêm vào registry dict** —
  không sửa bất kỳ call site nào đang gọi qua registry (đây là điểm cốt lõi: "thay 1 linh kiện
  không vỡ linh kiện khác").
- **Call site luôn tra qua registry**, không if/elif rải rác so tên provider/kind ở nhiều nơi (đó là
  chính lý do phải trừu tượng hoá — dồn hết logic chọn nhánh vào registry).
- Ví dụ tham khảo khi thêm registry mới: đọc cả `provider_adapter.py` (ADR-0012) lẫn `tool/builder.py`
  (ADR-0013) trước — 2 case có shape khác nhau (1 cái sync, 1 cái async nhận thêm `session`), chọn
  shape khớp nhu cầu thật, không copy máy móc.

## Error handling

Xem [`04-error-handling.md`](04-error-handling.md) — canonical duy nhất (domain error class,
bảng error code, wire format). Không liệt kê lại ở đây.

## Agent execution (LangGraph)

- `app/modules/agent/` = CRUD Agent + `AgentDelegation` (org chart, [ADR-0006](../adr/0006-multi-agent-org-chart.md)) — không chứa LangGraph.
- `app/modules/chat/` = LangGraph thật (`graph.py` dùng `create_react_agent`, `service.py` chạy 1 turn) — xem [ADR-0005](../adr/0005-langgraph-agent-execution.md).
- **KHÔNG** `import openjarvis` — tool tự viết, tham khảo pattern (không copy code) từ OpenJarvis khi cần.
- Checkpoint qua Postgres (cùng DB, [ADR-0003](../adr/0003-db-postgres-pgvector.md)) — chưa làm, xem roadmap.

## Naming

Xem [`05-naming.md`](05-naming.md) — canonical duy nhất (casing per-language, wire format
`snake_case`, domain glossary). Không liệt kê lại ở đây. Riêng cho `apps/api`: module folder
singular (`modules/conversation/`), route path plural (`/conversations`).

## Anti-pattern (tránh over-engineering do AI tự thêm)

- ❌ Business logic trong router.
- ❌ `import openjarvis` hoặc gọi sang service OpenJarvis (vi phạm ADR-0001).
- ❌ Tạo session SQLAlchemy rải rác thay vì dependency `get_session()`.
- ❌ Đổi DB/ORM/agent-framework mà không có ADR.
- ❌ Abstract base class/interface cho 1 implementation duy nhất — xem "Nguyên tắc thiết kế" trên.
- ❌ Class bọc quanh pure function không có state.
- ❌ Thêm tầng indirection mới (manager/interface) giữa router → service → repository.
- ❌ JSON column cho dữ liệu có shape rõ biết trước (nên là cột/bảng riêng).
- ❌ Bảng "thần thánh" dồn nhiều entity khác nhau qua cột `type`, hoặc ngược lại tách bảng quá vụn
  cho từng thuộc tính nhỏ.
- ❌ Code "phòng hờ mở rộng" — tham số/field/hook chưa ai gọi tới.

## Self-check trước khi xong

> Checklist canonical duy nhất cho `apps/api` — `backend-engineer`/`code-reviewer`/`qa-engineer`
> trỏ vào đây, KHÔNG liệt kê lại trong prompt agent (AGENTS.md rule 4). Sửa checklist → sửa ở đây.

- [ ] Router không chứa business logic, thân route ngắn (parse param → gọi service → return)?
- [ ] Schema Pydantic đúng shape `<Feature>Create`/`Update` (own `BaseModel`, field optional,
      KHÔNG kế thừa `Create`)/`Read`?
- [ ] Service không import `repository` của module khác (chỉ import `Service`)?
- [ ] Không có abstraction mới (interface/factory/manager/base class) cho case chỉ có 1 cài đặt
      thật — xem "Nguyên tắc thiết kế"?
- [ ] Model mới: FK không-null khi quan hệ bắt buộc, JSON column chỉ dùng cho data không có shape
      cố định, đã đối chiếu `docs/domain/01-entities.md`?
- [ ] Không có `import openjarvis` ở đâu (`grep -rn openjarvis apps/api/app`)?
- [ ] Không hardcode secret/API key (đọc qua `app/core/config.py`/`.env`)?
- [ ] Không có multi-tenant/workspace/RBAC mới (AGENTS.md rule 6) trừ khi có ADR quyết định khác?
- [ ] `cd apps/api && uv run ruff check . && uv run ruff format --check .` xanh?
- [ ] `uv run python scripts/check_module_boundaries.py` xanh?
- [ ] `uv run pytest -q` xanh (exit 5 = chưa có test collected, không tính là fail — nhưng flag code
      mới chưa có test)?
- [ ] Model mới/đổi → đã tạo + review migration (`uv run alembic revision --autogenerate`, đọc lại
      trước khi tin) và `uv run alembic upgrade head` chạy được?
- [ ] Quyết định kiến trúc mới → có ADR? Convention chưa cover case này → đã đề xuất bổ sung
      convention trước khi code (không tự nghĩ pattern riêng)?
