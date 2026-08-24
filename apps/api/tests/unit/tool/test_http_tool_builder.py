import httpx
import pytest

from app.modules.tool.builder import HttpToolBuilder, ToolSpec

CONFIG = {
    "request": {
        "method": "GET",
        "url": "https://api.example.com/weather",
        "headers": [{"name": "Authorization", "value": "Bearer secret-token"}],
        "query": [{"name": "units", "value": "metric"}],
        "body": None,
    },
    "ai_params": [{"name": "city", "description": "Tên thành phố", "type": "string"}],
}


def _make_spec(config: dict = CONFIG) -> ToolSpec:
    return ToolSpec(
        id=1,
        slug="get_weather",
        name="Get weather",
        description="Lấy thời tiết theo thành phố",
        kind="http",
        config=config,
    )


def test_build_returns_none_for_invalid_config() -> None:
    tool = HttpToolBuilder().build(_make_spec(config={"invalid": "shape"}))
    assert tool is None


def test_args_schema_only_exposes_ai_params() -> None:
    tool = HttpToolBuilder().build(_make_spec())
    assert tool is not None
    fields = tool.args_schema.model_fields
    assert "city" in fields
    assert "Authorization" not in fields
    assert "units" not in fields
    assert "headers" not in fields
    assert "query" not in fields


@pytest.mark.asyncio
async def test_placeholder_substitution_and_json_response(monkeypatch: pytest.MonkeyPatch) -> None:
    config = {
        "request": {
            "method": "GET",
            "url": "https://api.example.com/weather",
            "headers": [{"name": "Authorization", "value": "Bearer secret-token"}],
            "query": [{"name": "units", "value": "metric"}, {"name": "city", "value": "{{city}}"}],
            "body": None,
        },
        "ai_params": [{"name": "city", "description": "Tên thành phố", "type": "string"}],
    }
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = request.url
        captured["headers"] = request.headers
        return httpx.Response(200, json={"temp": 21, "city": "Hanoi"})

    transport = httpx.MockTransport(handler)

    class _MockAsyncClient(httpx.AsyncClient):
        def __init__(self, *args, **kwargs):
            kwargs["transport"] = transport
            super().__init__(*args, **kwargs)

    import app.modules.tool.builder as builder_module

    monkeypatch.setattr(builder_module.httpx, "AsyncClient", _MockAsyncClient)

    tool = HttpToolBuilder().build(_make_spec(config=config))
    assert tool is not None

    result = await tool.ainvoke({"city": "Hanoi"})

    assert captured["url"].params["city"] == "Hanoi"
    assert captured["url"].params["units"] == "metric"
    assert captured["headers"]["authorization"] == "Bearer secret-token"
    assert "21" in result
    assert "Hanoi" in result


@pytest.mark.asyncio
async def test_binary_response_returns_error_string_not_raise(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"\xff\xfe\x00\x80\x81")

    transport = httpx.MockTransport(handler)

    class _MockAsyncClient(httpx.AsyncClient):
        def __init__(self, *args, **kwargs):
            kwargs["transport"] = transport
            super().__init__(*args, **kwargs)

    import app.modules.tool.builder as builder_module

    monkeypatch.setattr(builder_module.httpx, "AsyncClient", _MockAsyncClient)

    tool = HttpToolBuilder().build(_make_spec())
    assert tool is not None

    result = await tool.ainvoke({"city": "Hanoi"})

    assert "binary" in result.lower() or "không đọc được" in result
