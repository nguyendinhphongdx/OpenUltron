# Convention — Error handling (`apps/api` ↔ `apps/web`)

> Canonical duy nhất cho error handling. `backend-engineer`/`frontend-engineer`/`code-reviewer` trỏ
> vào đây, không tự đặt error code/pattern riêng.

## Vì sao cần

Hiện tại (`apps/api/app/core/errors.py`) chỉ có 1 handler chung cho `HTTPException` — service raise
`HTTPException(status_code, detail)` trực tiếp, không có domain error class, không có code phân
loại. Đủ cho CRUD đơn giản, nhưng khi FE cần xử lý khác nhau theo loại lỗi (ví dụ: lỗi validation
hiển thị lên form field, lỗi "model provider timeout" hiển thị khác lỗi "agent không tồn tại") thì
so `status_code`/parse `detail` string là không đủ — cần 1 `code` ổn định máy đọc được.

## Layer

```text
Service raise DomainError  →  exception handler map → HTTP JSON  →  apps/web đọc `error.code`
```

## Domain error (`app/core/errors.py`)

```python
class UltronError(Exception):
    """Base cho mọi domain error — service raise cái này (hoặc subclass), KHÔNG raise HTTPException."""

    status_code: int = 500
    code: str = "internal.unknown"

    def __init__(self, message: str, *, details: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class ResourceNotFoundError(UltronError):
    status_code = 404
    code = "resource.not_found"

    def __init__(self, resource: str, identifier: object) -> None:
        super().__init__(f"{resource} not found: {identifier}", details={"resource": resource, "id": str(identifier)})


class ValidationFailedError(UltronError):
    status_code = 400
    code = "validation.failed"


class DelegationCycleError(UltronError):
    """AgentService._creates_cycle phát hiện — tạo AgentDelegation sẽ tạo cycle."""

    status_code = 409
    code = "agent.delegation_cycle"


class ModelProviderError(UltronError):
    """Provider (Gemini/OpenAI/Ollama/SGLang) trả lỗi hoặc timeout — core/providers.py raise."""

    status_code = 502
    code = "model.provider_failed"


class ToolExecutionError(UltronError):
    status_code = 500
    code = "tool.execution_failed"
```

**Bảng code hiện có** (thêm code mới → thêm vào bảng này, không tự đặt string rời rạc trong code):

| Code | HTTP status | Khi raise |
|---|---|---|
| `resource.not_found` | 404 | Get/update/delete entity không tồn tại (mọi module) |
| `validation.failed` | 400 | Business validation (khác Pydantic schema validation — cái đó FastAPI tự trả 422) |
| `agent.delegation_cycle` | 409 | `AgentService._creates_cycle` phát hiện cycle khi tạo `AgentDelegation` |
| `agent.delegation_depth_exceeded` | 409 | Vượt `MAX_DELEGATION_DEPTH` khi orchestrator gọi sub-agent |
| `model.provider_failed` | 502 | Gọi Gemini/OpenAI/Ollama/SGLang lỗi/timeout |
| `tool.execution_failed` | 500 | Tool call trong lúc chat lỗi |
| `knowledge_base.embedding_dimension_mismatch` | 400 | Embed dimension không khớp cột `Vector` đã tạo |
| `internal.unknown` | 500 | Fallback — exception không phải `UltronError`/`HTTPException` |

## Exception handler (`app/core/errors.py`)

```python
def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(UltronError)
    async def ultron_error_handler(request: Request, exc: UltronError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
                "timestamp": datetime.now(UTC).isoformat(),
                "path": request.url.path,
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        # Giữ cho code cũ/3rd-party raise HTTPException trực tiếp vẫn có response nhất quán —
        # code mới trong service PHẢI raise UltronError, không raise HTTPException.
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {"code": "http.error", "message": exc.detail, "details": None},
                "timestamp": datetime.now(UTC).isoformat(),
                "path": request.url.path,
            },
        )
```

Wire format JSON (đổi từ format cũ `{status_code, error, message, timestamp, path}` sang
`{error: {code, message, details}, timestamp, path}` — nhất quán field `error.code` cho FE đọc):

```json
{
  "error": {
    "code": "agent.delegation_cycle",
    "message": "Creating this delegation would create a cycle",
    "details": { "agent_id": 3, "sub_agent_id": 1 }
  },
  "timestamp": "2026-08-23T10:00:00+00:00",
  "path": "/agents/3/delegations"
}
```

## `apps/web` đọc lỗi

`src/lib/api/` có 1 hàm `parseApiError(response)` trả `{ code, message, details }` — service dùng
hàm này thay vì tự parse `response.data` rời rạc mỗi service. Component/hook switch theo `code` khi
cần UX khác nhau (ví dụ `validation.failed` → set lỗi lên field form; các code khác → toast chung).

## Anti-pattern

- ❌ Service raise `HTTPException` trực tiếp — đó là việc của handler, service raise `UltronError`
  (hoặc subclass).
- ❌ Raise `Exception("some string")` trần — không có `code`, FE không phân loại được.
- ❌ Đặt `code` mới mà không thêm vào bảng ở trên — bảng này phải luôn khớp code thật trong
  `app/core/errors.py`.
- ❌ Leak traceback Python vào response — chỉ log traceback (structlog, xem
  [`07-logging-observability.md`](07-logging-observability.md)), response chỉ có `message` ngắn.
- ❌ Catch lỗi rồi nuốt (`except Exception: pass`) — mất trace, khó debug agent/tool-call.

## Self-check trước khi xong

- [ ] Service raise `UltronError`/subclass, không raise `HTTPException` trực tiếp (trừ code cũ
      chưa migrate).
- [ ] Code mới → đã thêm vào bảng "Bảng code hiện có" ở trên.
- [ ] Response không leak traceback/internal path.
- [ ] FE cần xử lý riêng theo lỗi → đọc `error.code`, không parse `error.message` (message có thể
      đổi câu chữ, `code` không đổi).
