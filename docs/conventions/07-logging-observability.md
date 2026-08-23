# Convention — Logging & Observability (`apps/api`)

> Canonical duy nhất cho logging. Quyết định tool:
> [ADR-0008](../adr/0008-testing-logging-foundations.md) (`structlog`, không dùng `print`/stdlib
> `logging` thô). `apps/web` chưa có logging riêng — lỗi FE hiện xử lý qua
> [`04-error-handling.md`](04-error-handling.md) (toast/form error), chưa cần structured log.

## Vì sao

`apps/api/app` hiện **chưa có log statement nào**. Với 1 agent platform (orchestrator gọi sub-agent,
tool call, RAG lookup), debug 1 turn chat mà không có log có field tra được (agent nào được gọi, tool
nào chạy, mất bao lâu) thì chỉ còn cách đọc lại code — không scale khi orchestrator đa tầng
(`MAX_DELEGATION_DEPTH=5`).

## Setup

```bash
# apps/api/pyproject.toml — thêm vào dependencies
structlog>=24
```

`app/core/logging.py` (mới):

```python
import logging
import sys

import structlog


def configure_logging(level: str = "INFO") -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level)),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
    )


logger = structlog.get_logger()
```

Gọi `configure_logging(settings.log_level)` 1 lần trong `app/main.py` lúc bootstrap (đọc
`LOG_LEVEL` từ `.env` qua `app/core/config.py`, default `INFO`).

## Log level

| Level | Khi dùng |
|---|---|
| `error` | Exception bị catch, response 5xx, tool call thất bại |
| `warning` | Recoverable — provider retry thành công, delegation depth gần chạm limit |
| `info` | Business event: conversation tạo, agent tạo, 1 turn chat chạy xong, tool call xong |
| `debug` | Chi tiết dev-only: payload gửi provider, SQL query — OFF ở prod (`LOG_LEVEL=INFO` default) |

## Structured log — field bắt buộc

```python
from app.core.logging import logger

logger.info("agent.turn_completed", conversation_id=conv.id, agent_id=agent.id, duration_ms=420)
```

Output:

```json
{"event": "agent.turn_completed", "conversation_id": 12, "agent_id": 3, "duration_ms": 420, "level": "info", "timestamp": "2026-08-23T10:00:00Z"}
```

**Field bắt buộc mọi log**: `event` (dùng làm `event=` — KHÔNG viết câu message tự nhiên làm message
chính), `timestamp`, `level` (3 field này `structlog` tự thêm qua processor ở trên).

**Field theo context — thêm khi log trong luồng đó**:

| Context | Field thêm |
|---|---|
| Trong 1 request HTTP | `path`, `method` |
| Trong 1 turn chat | `conversation_id`, `agent_id` |
| Orchestrator gọi sub-agent | `agent_id`, `sub_agent_id`, `delegation_depth` |
| Tool call | `tool_name`, `tool_call_id` |
| Gọi model provider | `provider`, `model_id`, `duration_ms` |

## Event naming

`<resource>.<action>` lowercase, dot-separated — nhất quán để sau lọc dễ (`grep`/`jq`):

```text
conversation.created
agent.turn_completed
agent.delegation_created
tool.call_started
tool.call_completed
tool.call_failed
model.provider_request_failed
knowledge_base.search_completed
```

## PII / secret redaction

Không log: API key provider, nội dung `.env`, mật khẩu (Ultron hiện chưa có auth user nên chưa có
password — nếu thêm sau, áp dụng rule này). **OK log**: `conversation_id`, `agent_id`, `tool_name`
(không phải PII — Ultron 1 người dùng, không có PII người dùng khác cần bảo vệ giữa nhiều user).

Nếu tool call trả về nội dung nhạy cảm (ví dụ đọc file cá nhân) — log `tool_name` + kết quả **rút
gọn/hash**, không log full content trả về vào stdout log thường trực.

## Tracing / metrics — chưa làm, hoãn có chủ đích

Không làm OpenTelemetry/Langfuse/Grafana ngay (khác `cap` — cap cần vì nhiều tenant + SLA). Ultron 1
người dùng, chạy local — structured JSON log ra stdout, đọc trực tiếp hoặc pipe `jq` là đủ cho giai
đoạn hiện tại. Khi thật cần (nhiều service tách rời, cần debug latency cross-service, hoặc mở multi-
device thật) → quyết định lại qua ADR mới, không tự thêm OTEL trước khi cần (AGENTS.md rule 2).

## Anti-pattern

- ❌ `print(...)` trong `apps/api/app` — dùng `logger` từ `app/core/logging.py`.
- ❌ Log câu message tự nhiên không có `event=` field rõ — không `grep`/filter được.
- ❌ Log raw API key/`.env` content.
- ❌ Log full LLM prompt/response ở level `info` (dài, noise) — để `debug` nếu cần, và cân nhắc có
    nên log full content nhạy cảm không.
- ❌ Log mỗi bước loop nhỏ (mỗi token stream) → noise — log tổng hợp (bắt đầu/kết thúc + duration).

## Self-check trước khi xong

- [ ] Không còn `print()` trong code mới ở `apps/api/app`.
- [ ] Log có `event` field rõ, đúng convention `<resource>.<action>`.
- [ ] Log trong luồng chat/tool-call có field context liên quan (`conversation_id`/`agent_id`/
      `tool_name`) theo bảng trên.
- [ ] Không log secret/API key/full `.env`.
- [ ] Lỗi (except) → log ở level `error` kèm `exc_info=True` (structlog `format_exc_info`
      processor tự render traceback vào field, không tự `print(traceback)`).
