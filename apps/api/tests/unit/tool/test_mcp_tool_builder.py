from dataclasses import dataclass, field
from typing import Any

import pytest

from app.modules.tool.builder import McpToolBuilder, ToolSpec


@dataclass
class FakeRemoteTool:
    name: str
    description: str
    input_schema: dict[str, Any]


@dataclass
class FakeListToolsResult:
    tools: list[FakeRemoteTool]


@dataclass
class FakeCallToolResult:
    content: Any = None
    structured_content: Any = None
    is_error: bool = False


@dataclass
class FakeClient:
    remote_tools: list[FakeRemoteTool] = field(default_factory=list)
    call_result: FakeCallToolResult | None = None
    call_exception: Exception | None = None
    calls: list[tuple[str, dict]] = field(default_factory=list)

    def __call__(self, server: Any) -> "FakeClient":
        return self

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *exc: Any) -> None:
        return None

    async def list_tools(self) -> FakeListToolsResult:
        return FakeListToolsResult(tools=self.remote_tools)

    async def call_tool(self, name: str, args: dict) -> FakeCallToolResult:
        self.calls.append((name, args))
        if self.call_exception:
            raise self.call_exception
        return self.call_result or FakeCallToolResult()


def _make_spec(config: dict) -> ToolSpec:
    return ToolSpec(
        id=1, slug="mcp-add", name="MCP Add", description=None, kind="mcp", config=config
    )


_STDIO_CONFIG = {
    "server": {"transport": "stdio", "command": "python", "args": ["-m", "demo"]},
    "remote_tool_name": "add",
}

_ADD_INPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "a": {"type": "integer", "description": "số thứ nhất"},
        "b": {"type": "integer", "description": "số thứ hai"},
    },
    "required": ["a", "b"],
}


@pytest.mark.asyncio
async def test_build_returns_none_for_invalid_config() -> None:
    tool = await McpToolBuilder().build(_make_spec({"bad": "shape"}), session=None)  # type: ignore[arg-type]
    assert tool is None


@pytest.mark.asyncio
async def test_build_returns_none_when_remote_tool_not_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeClient(remote_tools=[FakeRemoteTool("other", "desc", _ADD_INPUT_SCHEMA)])
    import mcp

    monkeypatch.setattr(mcp, "Client", fake_client)

    tool = await McpToolBuilder().build(_make_spec(_STDIO_CONFIG), session=None)  # type: ignore[arg-type]
    assert tool is None


@pytest.mark.asyncio
async def test_build_returns_none_when_server_unreachable(monkeypatch: pytest.MonkeyPatch) -> None:
    class RaisingClient:
        def __call__(self, server: Any) -> "RaisingClient":
            return self

        async def __aenter__(self) -> "RaisingClient":
            raise ConnectionError("boom")

        async def __aexit__(self, *exc: Any) -> None:
            return None

    import mcp

    monkeypatch.setattr(mcp, "Client", RaisingClient())

    tool = await McpToolBuilder().build(_make_spec(_STDIO_CONFIG), session=None)  # type: ignore[arg-type]
    assert tool is None


@pytest.mark.asyncio
async def test_build_discovers_args_schema_and_calls_remote_tool(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeClient(
        remote_tools=[FakeRemoteTool("add", "Cộng 2 số", _ADD_INPUT_SCHEMA)],
        call_result=FakeCallToolResult(structured_content={"result": 7}),
    )
    import mcp

    monkeypatch.setattr(mcp, "Client", fake_client)

    tool = await McpToolBuilder().build(_make_spec(_STDIO_CONFIG), session=None)  # type: ignore[arg-type]
    assert tool is not None
    fields = tool.args_schema.model_fields
    assert set(fields) == {"a", "b"}

    result = await tool.ainvoke({"a": 3, "b": 4})

    assert fake_client.calls == [("add", {"a": 3, "b": 4})]
    assert "7" in result


@pytest.mark.asyncio
async def test_call_returns_error_message_when_result_is_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeClient(
        remote_tools=[FakeRemoteTool("add", "Cộng 2 số", _ADD_INPUT_SCHEMA)],
        call_result=FakeCallToolResult(content="bad input", is_error=True),
    )
    import mcp

    monkeypatch.setattr(mcp, "Client", fake_client)

    tool = await McpToolBuilder().build(_make_spec(_STDIO_CONFIG), session=None)  # type: ignore[arg-type]
    assert tool is not None

    result = await tool.ainvoke({"a": 1, "b": 2})

    assert "lỗi" in result
