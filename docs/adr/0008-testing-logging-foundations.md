# ADR-0008 — Testing (testcontainers Postgres) + Logging (structlog) foundations

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-23

## Context

Ultron chưa có test nào chạy thật (`apps/api/tests/` không tồn tại, `apps/web` chưa cài framework
test nào) và chưa có 1 log statement nào trong `apps/api/app` — cả 2 là gap được phát hiện khi đối
chiếu convention của Ultron với convention đã hoàn chỉnh của 1 monorepo khác (`cap`, TS/NestJS) để
dựng convention testing/logging cho Ultron thay vì để trống.

Cần chốt trước khi viết `docs/conventions/03-testing.md` và `07-logging-observability.md`:

1. Test integration cho `apps/api` verify DB thật (SQLAlchemy query, `pgvector` search) bằng cách
   nào — mock hay DB thật, và nếu DB thật thì lấy từ đâu.
2. `apps/api` log bằng thư viện gì — hiện đang dùng `print`/không log gì.

## Decision

**1. Testing — Postgres thật qua `testcontainers-python`, không mock repository/DB.**

- Thêm dependency dev: `testcontainers[postgres]`.
- Boot container từ image **`pgvector/pgvector:pg17`** — đúng image đã dùng ở
  `infra/docker-compose.yml` ([ADR-0003](0003-db-postgres-pgvector.md)), đảm bảo extension
  `vector` có sẵn cho test liên quan `KnowledgeChunk`/search.
- Áp dụng cho **mọi** integration test (không tách SQLite cho phần không đụng `Vector`) — để tránh
  2 hệ test DB khác nhau (SQLite vs Postgres) tồn tại song song, đúng tinh thần "verify thật, không
  mock" đã ghi trong roadmap khi test KB search lần đầu (chunk liên quan score 0.22 vs không liên
  quan 0.60 — verify qua Postgres thật, không phải giả định).
- Unit test (pure logic, không đụng DB/SQLAlchemy session) vẫn chạy không cần container.

**2. Logging — `structlog`, JSON structured, không dùng `print`/stdlib `logging` thô.**

- Thêm dependency: `structlog`.
- Format JSON ở `stdout`, field bắt buộc tối thiểu: `event`, `timestamp`, `level`; thêm
  `conversation_id`/`agent_id`/`tool_name` khi log trong luồng chat/tool-call.
- Lý do chọn `structlog` hơn stdlib `logging`: Ultron là agent platform — debug 1 turn chat (agent
  nào được gọi, tool nào chạy, orchestrator delegate cho sub-agent nào) cần log có field tra được,
  không phải câu message tự nhiên. Không cần OpenTelemetry/Langfuse ngay — Ultron chỉ 1 người dùng,
  chưa cần dashboard/alerting; structured JSON ra stdout đủ dùng cho giai đoạn hiện tại, đọc trực
  tiếp hoặc pipe qua `jq`.

## Consequences

- ✅ Test integration sát thật (bug `Vector`/constraint/migration sẽ lộ ra ở test, không escape).
- ✅ Log có field tra được — debug orchestrator/tool-call không phải đọc lại code để đoán trạng thái.
- ⚠️ Integration test cần Docker chạy được ở máy dev/CI — chấp nhận được vì `infra/docker-compose.yml`
  đã giả định có Docker sẵn cho dev, không phải yêu cầu mới.
- ⚠️ Chưa làm tracing/dashboard (OpenTelemetry, Grafana) — hoãn tới khi thật cần (nhiều hơn 1 người
  dùng, hoặc cần debug latency cross-service) — không đầu tư trước khi cần, đúng rule 2 AGENTS.md.

## Alternatives considered

- **SQLite cho integration test** (model đã có `.with_variant(JSON, "sqlite")` sẵn cho cột JSON):
  đủ cho phần không đụng `pgvector`, nhưng tách 2 hệ test DB (SQLite cho phần thường, Postgres cho
  phần KB) tăng phức tạp maintain hơn lợi ích tốc độ — bị bỏ để giữ 1 nguồn sự thật.
- **stdlib `logging`**: không cần thêm dependency, nhưng output không structured sẵn — sau muốn lọc
  theo `conversation_id` phải tự parse text, ngược lại mục tiêu debug agent execution.
- **Mock DB/repository trong test** (giống anti-pattern mà `cap` liệt kê): bug loại
  `check_module_boundaries`/constraint/migration sẽ escape qua test — bị loại.
