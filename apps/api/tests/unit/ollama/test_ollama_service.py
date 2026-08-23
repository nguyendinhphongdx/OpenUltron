import httpx
import pytest
from fastapi import HTTPException

from app.modules.ollama import service as service_module
from app.modules.ollama.service import OllamaService


class _FakeGetResponse:
    def __init__(self, json_data: dict, status_code: int = 200) -> None:
        self._json = json_data
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=None)  # type: ignore[arg-type]

    def json(self) -> dict:
        return self._json


class _FakeStreamResponse:
    def __init__(self, lines: list[str], status_code: int = 200) -> None:
        self._lines = lines
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=None)  # type: ignore[arg-type]

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _FakeStreamContext:
    def __init__(self, response: _FakeStreamResponse) -> None:
        self._response = response

    async def __aenter__(self) -> _FakeStreamResponse:
        return self._response

    async def __aexit__(self, *exc_info: object) -> bool:
        return False


class _FakeAsyncClient:
    """Giả `httpx.AsyncClient` — unit test thuần, không cần Ollama thật chạy (03-testing.md)."""

    get_response: _FakeGetResponse | None = None
    stream_response: _FakeStreamResponse | None = None
    connect_error: bool = False

    def __init__(self, *args: object, **kwargs: object) -> None:
        pass

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *exc_info: object) -> bool:
        return False

    async def get(self, url: str, **kwargs: object) -> _FakeGetResponse:
        if self.connect_error:
            raise httpx.ConnectError("connection refused")
        assert self.get_response is not None
        return self.get_response

    def stream(self, method: str, url: str, **kwargs: object) -> _FakeStreamContext:
        assert self.stream_response is not None
        return _FakeStreamContext(self.stream_response)


@pytest.fixture(autouse=True)
def _reset_fake_client() -> None:
    _FakeAsyncClient.get_response = None
    _FakeAsyncClient.stream_response = None
    _FakeAsyncClient.connect_error = False


def test_catalog_returns_static_list() -> None:
    entries = OllamaService().catalog()
    assert len(entries) > 0
    assert all(e.name for e in entries)


@pytest.mark.asyncio
async def test_list_installed_maps_ollama_tags_response(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service_module.httpx, "AsyncClient", _FakeAsyncClient)
    _FakeAsyncClient.get_response = _FakeGetResponse(
        {"models": [{"name": "qwen2.5:0.5b", "size": 397821319}]}
    )

    result = await OllamaService().list_installed()

    assert result == [
        service_module.OllamaInstalledModel(name="qwen2.5:0.5b", size_bytes=397821319)
    ]


@pytest.mark.asyncio
async def test_list_installed_network_error_raises_502(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service_module.httpx, "AsyncClient", _FakeAsyncClient)
    _FakeAsyncClient.connect_error = True

    with pytest.raises(HTTPException) as exc_info:
        await OllamaService().list_installed()
    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_pull_maps_ndjson_lines_to_events(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(service_module.httpx, "AsyncClient", _FakeAsyncClient)
    _FakeAsyncClient.stream_response = _FakeStreamResponse(
        lines=[
            '{"status": "pulling manifest"}',
            '{"status": "pulling abc", "completed": 10, "total": 100}',
            "",  # dòng rỗng — phải bị bỏ qua, không parse JSON lỗi
            '{"status": "success"}',
        ]
    )

    events = [event async for event in OllamaService().pull("qwen2.5:0.5b")]

    assert [e.status for e in events] == ["pulling manifest", "pulling abc", "success"]
    assert events[1].completed == 10
    assert events[1].total == 100
