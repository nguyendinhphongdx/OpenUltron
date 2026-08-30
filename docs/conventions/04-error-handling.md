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


class ConflictError(UltronError):
    """Duplicate slug/name, hoặc quan hệ (assignment) đã tồn tại — vd tạo lại slug đã dùng, gán lại
    KnowledgeBase/Tool đã gán cho Agent, delegate lại sub-agent đã delegate."""

    status_code = 409
    code = "resource.conflict"


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
| `resource.conflict` | 409 | Duplicate slug/name (model/agent/tool/knowledge_base/folder), hoặc quan hệ assignment đã tồn tại (agent-kb, agent-tool, agent delegation đã có) |
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
                "status_code": exc.status_code,
                "error": exc.code,
                "message": exc.message,
                "details": exc.details,
                "timestamp": datetime.now(UTC).isoformat(),
                "path": request.url.path,
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        # Giữ cho code cũ/3rd-party raise HTTPException trực tiếp vẫn có response cùng shape —
        # code mới trong service PHẢI raise UltronError, không raise HTTPException.
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status_code": exc.status_code,
                "error": exc.__class__.__name__,
                "message": exc.detail,
                "timestamp": datetime.now(UTC).isoformat(),
                "path": request.url.path,
            },
        )
```

Wire format JSON — **shape thật đang chạy** (flat, `error` là string code/class name, không phải
object lồng). Bản trước của tài liệu này mô tả shape lồng `{error: {code, message, details}}` như
mục tiêu — đã KHÔNG implement đúng vậy có chủ đích: `apps/web/src/lib/api/errors.ts` đọc top-level
`data.message`/status, đổi sang shape lồng ngay lúc thêm `UltronError` sẽ gãy FE đang chạy mà không
sửa cùng lúc. Giữ nguyên flat shape này làm canonical — không tự đổi sang nested khi chưa có quyết
định + sửa FE đồng bộ:

```json
{
  "status_code": 409,
  "error": "agent.delegation_cycle",
  "message": "Creating this delegation would create a cycle",
  "details": { "agent_id": 3, "sub_agent_id": 1 },
  "timestamp": "2026-08-23T10:00:00+00:00",
  "path": "/agents/3/delegations"
}
```

`error` là `exc.code` (`UltronError`) hoặc tên class HTTPException (`http.error`-style cũ) — FE có
thể switch theo field này để phân biệt loại lỗi, `message` chỉ để hiển thị, có thể đổi câu chữ.

## `apps/web` đọc lỗi

`src/lib/api/errors.ts` có `getApiErrorMessage(err)`/`getApiStatus(err)` đọc đúng shape flat ở trên
(`data.message`, `response.status`) — service/hook dùng 2 hàm này thay vì tự parse `response.data`
rời rạc. Cần phân biệt loại lỗi (vd `validation.failed` → set lỗi lên field form) → đọc thêm
`data.error` (string code), không parse `data.message` (message có thể đổi câu chữ, `error` không
đổi).

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
- [ ] FE cần xử lý riêng theo lỗi → đọc field `error` (code, top-level, không lồng), không parse
      `message` (message có thể đổi câu chữ, `error` không đổi).
