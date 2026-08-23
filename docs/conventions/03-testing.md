# Convention — Testing (`apps/api` + `apps/web`)

> Canonical duy nhất cho testing — `backend-engineer`/`frontend-engineer`/`qa-engineer`/
> `code-reviewer` trỏ vào đây, không liệt kê lại rule ở agent prompt hay ở convention layering
> ([01](01-backend-fastapi.md)/[02](02-frontend-nextjs.md)) — 2 file đó chỉ có pointer sang đây.
> Quyết định tool: [ADR-0008](../adr/0008-testing-logging-foundations.md).

## TL;DR

| App | Unit | Integration |
|---|---|---|
| `apps/api` | pytest, không đụng DB/session | pytest + `testcontainers[postgres]` (image `pgvector/pgvector:pg17`, DB thật) |
| `apps/web` | Vitest (`environment: node`), pure function | Vitest + `@testing-library/react` + `jsdom`, mock `apiClient` |

**Nguyên tắc xuyên suốt**:

1. Ultron không có E2E browser tự động ở giai đoạn này (dự án nhỏ, 1 người dùng) — golden path
   verify tay trong browser trước khi báo done (đã ghi trong AGENTS.md phần "Doing tasks"). Thêm
   Playwright là quyết định sau, khi có ≥2 luồng người dùng chính cần bảo vệ khỏi regression.
2. **`apps/api` không mock DB/repository** — dùng Postgres thật qua testcontainer (ADR-0008). Mock
   chỉ dành cho external thật (Gemini/OpenAI/Ollama provider HTTP call).
3. **`apps/web` mock `apiClient`** (không có `apps/api` chạy thật trong test FE) — service/hook test
   mock ở tầng `services/`, component test mock qua hook.
4. Sửa code = sửa/thêm test tương ứng — không skip vì "nhỏ".

---

## `apps/api` — Backend testing

### Folder

```text
apps/api/
├── app/                        ← source, không có test co-located
└── tests/
    ├── conftest.py              ← fixture chung: event_loop, testcontainer session-scoped
    ├── unit/                    ← không đụng DB — mirror app/modules/<x>/ khi cần
    │   └── agent/
    │       └── test_creates_cycle.py   ← pure logic, ví dụ AgentService._creates_cycle (BFS)
    └── integration/             ← 1 folder / module, DB thật qua testcontainer
        ├── model/
        │   └── test_model_crud.py
        ├── agent/
        │   └── test_agent_delegation.py    ← tạo AgentDelegation, chống cycle, đa tầng
        ├── chat/
        │   └── test_chat_turn.py            ← chạy 1 turn qua graph, orchestrator gọi sub-agent
        └── knowledge_base/
            └── test_chunk_search.py         ← embed thật hoặc fixture vector cố định, cosine search
```

### Fixture (`tests/conftest.py`)

- Fixture `postgres_container` (session-scoped): boot `testcontainers.postgres.PostgresContainer`
  từ image `pgvector/pgvector:pg17` (đúng image `infra/docker-compose.yml`), chạy
  `CREATE EXTENSION IF NOT EXISTS vector` + `alembic upgrade head` 1 lần.
- Fixture `db_session` (function-scoped): mở `AsyncSession` mới mỗi test, **TRUNCATE** toàn bộ table
  sau mỗi test (không dùng transaction rollback — rollback không phản ánh đúng nếu sau này có
  code chạy ở transaction riêng, và dễ nhầm khi debug).
- Fixture `client` (function-scoped): `httpx.AsyncClient` override `get_session` dependency bằng
  `db_session` — dùng khi cần test qua router (HTTP-level).

### 2 loại test

**Unit** (`tests/unit/`) — pure logic không cần DB/session: `AgentService._creates_cycle` (BFS
detect cycle), parser/validator thuần, helper trong `core/`. Không mock DB vì không cần DB.

**Integration** (`tests/integration/<module>/test_<feature>.py`) — bootstrap `db_session` thật, gọi
**service** trực tiếp (bỏ qua HTTP) cho phần lớn case; chỉ thêm test qua `client` (router) khi cần
verify riêng HTTP wiring (status code, `response_model`, dependency injection qua `deps.py`) — 2-4
test/endpoint, không lặp lại invariant đã cover ở service-level.

**Cover** (giống roadmap đã verify tay 1 lần — giờ biến thành test tự động):
- Happy path: action xảy ra, state DB đúng (query lại qua repository/raw SQL).
- Mỗi invariant: 1 test reject (cycle trong `AgentDelegation`, FK sai, `MAX_DELEGATION_DEPTH`).
- KB search: chunk liên quan phải có cosine distance nhỏ hơn chunk không liên quan (như lần verify
  tay "0.22 vs 0.60" trong roadmap — giờ assert bằng số, không phải đọc log tay).

### Mock — chỉ cho external thật

Provider Gemini/OpenAI/Ollama qua HTTP → mock ở boundary `core/providers.py` (mock response của
`ChatOpenAI`/`ChatGoogleGenerativeAI`, không mock SQLAlchemy). Không có network thật trong test
(trừ khi test đánh dấu rõ `@pytest.mark.manual` và chạy tay khi có API key, giống ghi chú ở roadmap
"chưa live-test — cần GEMINI_API_KEY").

---

## `apps/web` — Frontend testing

### Tooling & setup (lần đầu cần — chưa cài)

```bash
pnpm --filter @ultron/web add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

`vitest.config.ts`: `environment: 'jsdom'` cho test component, tách riêng nếu sau cần thêm unit
test kiểu `environment: 'node'` cho pure util (không bắt buộc ngay, thêm khi có nhu cầu thật).

### Folder

```text
apps/web/
├── src/                         ← source, không co-located test
└── test/
    ├── setup/
    │   └── render.tsx            ← custom render wrap QueryClientProvider
    ├── lib/
    │   └── utils.spec.ts         ← pure util (cn(), formatter)
    └── features/
        └── <feature>/
            ├── services/<name>.spec.ts   ← mock apiClient, assert request/response mapping
            ├── hooks/<name>.spec.ts       ← renderHook, mock service
            └── components/<name>.spec.tsx ← render + Testing Library, query theo role/text
```

### Cover

- `services/`: request đúng endpoint (từ `src/lib/api/endpoints.ts`), map response đúng type.
- `hooks/`: `useQuery`/`useMutation` trả đúng state (loading/success/error) khi service mock throw
  hoặc resolve.
- `components/`: render đúng UI, user interaction (click/type) → state đổi đúng, callback prop được
  gọi đúng data. **Không** snapshot toàn markup.

---

## Anti-pattern

- ❌ Mock DB/repository ở `apps/api` — dùng testcontainer (ADR-0008).
- ❌ Test co-located cạnh source (`service.py` + `test_service.py` cùng folder) — luôn ở `tests/`
  (`apps/api`) hoặc `test/` (`apps/web`).
- ❌ Assert qua raw SQL/response mà không thật sự exercise code path đang test (test giả).
- ❌ Snapshot toàn trang/markup lớn ở FE — drift vô nghĩa khi refactor nhỏ.
- ❌ Skip test vì "nhỏ" — sửa code = sửa/thêm test.
- ❌ `it.only`/`pytest.mark.skip` còn sót khi commit.

## Self-check trước khi xong

- [ ] Code mới có test tương ứng (unit nếu pure logic, integration nếu đụng DB/HTTP).
- [ ] `cd apps/api && uv run pytest -q` xanh (integration cần Docker chạy — container tự boot qua
      fixture, không cần chạy tay `docker-compose up` trước, trừ khi debug).
- [ ] `pnpm --filter @ultron/web test` xanh (khi feature có test FE).
- [ ] Invariant/edge case (empty, cycle, cross-reference sai) có test reject, không chỉ happy path.
- [ ] Không còn `it.only`/`console.log`/`pytest.mark.skip` sót lại.
