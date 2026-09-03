from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.core.logging import logger


class UltronError(Exception):
    """Base cho mọi domain error — service raise cái này (hoặc subclass), KHÔNG raise
    `HTTPException` (docs/conventions/04-error-handling.md)."""

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
        super().__init__(
            f"{resource} not found: {identifier}",
            details={"resource": resource, "id": str(identifier)},
        )


class ValidationFailedError(UltronError):
    status_code = 400
    code = "validation.failed"


class ConflictError(UltronError):
    """Duplicate slug/name, hoặc quan hệ (assignment) đã tồn tại — vd tạo lại slug đã dùng, gán lại
    KnowledgeBase/Tool đã gán cho Agent, delegate lại sub-agent đã delegate."""

    status_code = 409
    code = "resource.conflict"


class DelegationCycleError(UltronError):
    """`AgentService._creates_cycle` phát hiện — tạo `AgentDelegation` sẽ tạo cycle."""

    status_code = 409
    code = "agent.delegation_cycle"


class ModelProviderError(UltronError):
    """Provider (Gemini/OpenAI/Ollama/SGLang) trả lỗi hoặc timeout — `core/providers.py` raise."""

    status_code = 502
    code = "model.provider_failed"


class ToolExecutionError(UltronError):
    status_code = 500
    code = "tool.execution_failed"


def register_exception_handlers(app: FastAPI) -> None:
    """Chuẩn hoá response lỗi toàn API (docs/conventions/01-backend-fastapi.md,
    docs/conventions/04-error-handling.md)."""

    @app.exception_handler(UltronError)
    async def ultron_error_handler(request: Request, exc: UltronError) -> JSONResponse:
        # Wire shape 04-error-handling.md đề xuất `{error: {code, message, details}}` — CHƯA áp
        # dụng ở đây có chủ đích: `apps/web/src/lib/api/errors.ts::getApiErrorMessage` hiện chỉ đọc
        # `data.message` top-level (chưa có `parseApiError` như convention mô tả — đó là việc riêng,
        # lớn hơn, thuộc roadmap "áp dụng phần còn lại convention 03-08", không phải scope feature
        # này). Giữ shape cũ (top-level `message`) để `ValidationFailedError` mới thêm hiện đúng
        # message cho user ngay, không rơi về "Có lỗi xảy ra..." chung — bug thật sẽ xảy ra nếu đổi
        # shape ở đây mà không sửa frontend cùng lúc.
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
        # Service code (app/modules/) không còn nơi nào raise HTTPException trực tiếp nữa (đã qua
        # UltronError hết) — handler này giờ chỉ bắt HTTPException do chính FastAPI/Starlette tự
        # raise (404 route không khớp, 405 method not allowed...), giữ cùng shape response để FE
        # không cần phân biệt nguồn gốc lỗi.
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

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Lưới an toàn cuối — bug/edge case không lường trước (không phải UltronError/HTTPException)
        # trước đây rơi thẳng vào default handler của Starlette: không có body JSON đúng shape, và
        # ở debug mode có thể leak traceback Python thẳng ra response (anti-pattern đã ghi trong
        # 04-error-handling.md). Log đầy đủ traceback qua structlog (07-logging-observability.md),
        # response chỉ có message ngắn, không có chi tiết nội bộ.
        logger.error(
            "http.unhandled_exception", path=request.url.path, method=request.method, exc_info=exc
        )
        return JSONResponse(
            status_code=500,
            content={
                "status_code": 500,
                "error": "internal.unknown",
                "message": "Đã có lỗi không mong muốn xảy ra.",
                "details": None,
                "timestamp": datetime.now(UTC).isoformat(),
                "path": request.url.path,
            },
        )
