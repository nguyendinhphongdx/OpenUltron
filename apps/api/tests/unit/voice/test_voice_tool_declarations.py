"""Gap có ghi trong roadmap: voice trước đây chỉ khai/gọi được SUB-AGENT
(`_sub_agent_declarations`), không thấy tool/KB gắn TRỰC TIẾP trên agent chính — user hỏi thẳng
"tìm trong KB..." qua voice thì model không có tool nào để gọi. Test thuần (03-testing.md — không
cần DB/WebSocket, chỉ mock `build_tools`/`build_kb_search_tool` ở boundary)."""

import pytest

import app.modules.voice.service as voice_service_module
from app.modules.chat.graph import KnowledgeBaseSpec
from app.modules.tool.builder import RUN_COMMAND_SLUG, ToolSpec
from app.modules.voice.service import (
    _call_own_tool,
    _kb_search_declarations,
    _own_tool_declarations,
)


def _kb(slug: str = "docs") -> KnowledgeBaseSpec:
    return KnowledgeBaseSpec(id=1, slug=slug, name="Docs", description="Tài liệu nội bộ")


def _tool_spec(slug: str, kind: str = "http") -> ToolSpec:
    return ToolSpec(id=1, slug=slug, name=slug, description=None, kind=kind, config=None)


def test_kb_search_declarations_uses_query_schema() -> None:
    declarations = _kb_search_declarations([_kb()])

    assert len(declarations) == 1
    assert declarations[0].name == "search-knowledge-base-docs"
    assert declarations[0].parameters == {
        "type": "object",
        "properties": {"query": {"type": "string"}},
        "required": ["query"],
    }


@pytest.mark.asyncio
async def test_own_tool_declarations_excludes_gated_and_mcp_tools(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Fail-closed (cùng lý do addendum ADR-0014 áp cho `run_sub_agent`) — voice không đi qua
    approval gate, tool rủi ro cao/MCP không được khai cho voice gọi trực tiếp."""
    from langchain_core.tools import tool as lc_tool

    @lc_tool
    def weather_lookup(city: str) -> str:
        """Tra cứu thời tiết."""
        return f"weather for {city}"

    async def fake_build_tools(tools: list[ToolSpec], *, session: object) -> list:
        # Chỉ tool đã lọt qua filter fail-closed mới tới đây — xác nhận qua assert bên dưới.
        assert [t.slug for t in tools] == ["weather-lookup"]
        return [weather_lookup]

    monkeypatch.setattr(voice_service_module, "build_tools", fake_build_tools)

    declarations = await _own_tool_declarations(
        [
            _tool_spec("weather-lookup"),
            _tool_spec(RUN_COMMAND_SLUG, kind="builtin"),
            _tool_spec("some-mcp-tool", kind="mcp"),
        ],
        session=None,  # type: ignore[arg-type]
    )

    assert len(declarations) == 1
    assert declarations[0].name == "weather_lookup"
    assert declarations[0].parameters["required"] == ["city"]
    assert declarations[0].parameters["properties"]["city"]["type"] == "string"


@pytest.mark.asyncio
async def test_call_own_tool_returns_none_when_no_match(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_build_tools(tools: list[ToolSpec], *, session: object) -> list:
        return []

    monkeypatch.setattr(voice_service_module, "build_tools", fake_build_tools)

    result = await _call_own_tool(
        "khong-ton-tai", {}, tools=[_tool_spec("weather-lookup")], knowledge_bases=[]
    )

    assert result is None


@pytest.mark.asyncio
async def test_call_own_tool_calls_kb_search(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeKbTool:
        async def ainvoke(self, arguments: dict) -> str:
            assert arguments == {"query": "chính sách nghỉ phép"}
            return "kết quả tìm được"

    def fake_build_kb_search_tool(kb: KnowledgeBaseSpec, *, session: object) -> FakeKbTool:
        assert kb.slug == "docs"
        return FakeKbTool()

    monkeypatch.setattr(voice_service_module, "build_kb_search_tool", fake_build_kb_search_tool)

    result = await _call_own_tool(
        "search-knowledge-base-docs",
        {"query": "chính sách nghỉ phép"},
        tools=[],
        knowledge_bases=[_kb()],
    )

    assert result == "kết quả tìm được"


@pytest.mark.asyncio
async def test_call_own_tool_fails_closed_for_gated_tool_even_if_model_calls_it_by_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """2 lớp bảo vệ: `_own_tool_declarations` không khai tool này ra cho model, NHƯNG nếu model
    (do hallucination hoặc lấy tên từ đâu đó) vẫn gọi đúng slug thật, `_call_own_tool` cũng phải tự
    lọc lại — không tin tưởng mù vào việc "model chỉ gọi tool đã khai"."""

    async def fake_build_tools(tools: list[ToolSpec], *, session: object) -> list:
        raise AssertionError(
            "không được build tool bị gate — phải bị lọc trước khi tới build_tools"
        )

    monkeypatch.setattr(voice_service_module, "build_tools", fake_build_tools)

    result = await _call_own_tool(
        RUN_COMMAND_SLUG,
        {"command": "rm -rf /"},
        tools=[_tool_spec(RUN_COMMAND_SLUG, kind="builtin")],
        knowledge_bases=[],
    )

    assert result is None
