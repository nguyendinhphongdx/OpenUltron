"""docs/conventions/04-error-handling.md — cả 3 exception handler (`UltronError`, `HTTPException`,
catch-all `Exception`) phải trả cùng 1 shape JSON để `apps/web` không cần phân biệt nguồn gốc lỗi.
App FastAPI tối giản dựng riêng cho test này (không tái dùng `app.main.app` — không cần toàn bộ
router/lifespan thật chỉ để test exception handler)."""

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.errors import ResourceNotFoundError, register_exception_handlers

app = FastAPI()
register_exception_handlers(app)


@app.get("/ultron-error")
def _raise_ultron_error() -> None:
    raise ResourceNotFoundError("Agent", 42)


@app.get("/http-exception")
def _raise_http_exception() -> None:
    raise HTTPException(status_code=418, detail="teapot")


@app.get("/unhandled")
def _raise_unhandled() -> None:
    raise ValueError("bug thật, không lường trước")


client = TestClient(app, raise_server_exceptions=False)


def test_ultron_error_returns_flat_shape_with_code() -> None:
    response = client.get("/ultron-error")

    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "resource.not_found"
    assert body["message"] == "Agent not found: 42"
    assert body["details"] == {"resource": "Agent", "id": "42"}
    assert body["status_code"] == 404
    assert body["path"] == "/ultron-error"


def test_http_exception_returns_same_flat_shape() -> None:
    response = client.get("/http-exception")

    assert response.status_code == 418
    body = response.json()
    assert body["error"] == "HTTPException"
    assert body["message"] == "teapot"
    assert body["status_code"] == 418


def test_unhandled_exception_falls_back_to_internal_unknown_without_leaking_traceback() -> None:
    """Trước đây KHÔNG có handler cho `Exception` trần — bug thật sẽ rơi vào default handler của
    Starlette, không đúng shape JSON và có thể leak traceback ở debug mode."""
    response = client.get("/unhandled")

    assert response.status_code == 500
    body = response.json()
    assert body["error"] == "internal.unknown"
    assert body["status_code"] == 500
    # Không leak message/traceback nội bộ ra response.
    assert "ValueError" not in body["message"]
    assert "bug thật" not in body["message"]
