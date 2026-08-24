from app.modules.chat.graph import _human_in_the_loop_middleware
from app.modules.tool.builder import APPROVAL_TEST_TOOL_SLUG, ToolSpec


def _spec(slug: str, kind: str) -> ToolSpec:
    return ToolSpec(id=1, slug=slug, name=slug, description=None, kind=kind, config=None)


def test_no_middleware_when_no_tool_needs_approval() -> None:
    tools = [_spec("weather-lookup", "http"), _spec("github-search-code", "builtin")]
    assert _human_in_the_loop_middleware(tools) == []


def test_middleware_added_for_slug_requiring_approval() -> None:
    tools = [_spec(APPROVAL_TEST_TOOL_SLUG, "builtin")]
    middleware = _human_in_the_loop_middleware(tools)
    assert len(middleware) == 1


def test_middleware_added_for_any_mcp_tool_regardless_of_slug() -> None:
    """kind=mcp gate theo kind, không theo slug cố định (ADR-0017) — slug do user tự đặt tuỳ ý
    khi khai Tool, không thể liệt kê trước trong TOOLS_REQUIRING_APPROVAL."""
    tools = [_spec("my-custom-mcp-tool", "mcp")]
    middleware = _human_in_the_loop_middleware(tools)
    assert len(middleware) == 1


def test_http_and_readonly_builtin_tools_do_not_require_approval() -> None:
    tools = [_spec("weather-lookup", "http"), _spec("github-read-file", "builtin")]
    assert _human_in_the_loop_middleware(tools) == []
