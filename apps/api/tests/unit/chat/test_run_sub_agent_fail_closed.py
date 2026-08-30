"""ADR-0014 addendum (2026-08-30) — sub-agent chạy lồng không có approval gate (nested interrupt
ngoài phạm vi), nên tool rủi ro cao phải bị loại khỏi tool list của sub-agent (fail-closed) thay vì
gọi được mà không ai duyệt."""

from types import SimpleNamespace

import pytest

import app.modules.chat.graph as graph_module
from app.modules.chat.graph import ModelConfig, SubAgentSpec, run_sub_agent
from app.modules.tool.builder import APPROVAL_TEST_TOOL_SLUG, ToolSpec


def _spec(slug: str, kind: str) -> ToolSpec:
    return ToolSpec(id=1, slug=slug, name=slug, description=None, kind=kind, config=None)


@pytest.mark.asyncio
async def test_run_sub_agent_excludes_approval_gated_and_mcp_tools(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen_tools: list[ToolSpec] = []

    async def fake_build_chat_model(**kwargs: object) -> object:
        return SimpleNamespace()

    async def fake_build_tools(tools: list[ToolSpec], *, session: object) -> list:
        seen_tools.extend(tools)
        return []

    def fake_create_agent(model: object, *, tools: list, system_prompt: str) -> SimpleNamespace:
        async def ainvoke(input_data: object) -> dict:
            return {"messages": [SimpleNamespace(content="ok")]}

        return SimpleNamespace(ainvoke=ainvoke)

    monkeypatch.setattr(graph_module, "build_chat_model", fake_build_chat_model)
    monkeypatch.setattr(graph_module, "build_tools", fake_build_tools)
    monkeypatch.setattr(graph_module, "create_agent", fake_create_agent)

    sub_agent = SubAgentSpec(
        slug="sub",
        description=None,
        system_prompt="you are a sub agent",
        model=ModelConfig(provider="ollama", model_id="test-model"),
        tools=[
            _spec("weather-lookup", "http"),
            _spec(APPROVAL_TEST_TOOL_SLUG, "builtin"),
            _spec("my-custom-mcp-tool", "mcp"),
        ],
    )

    result = await run_sub_agent(sub_agent, "làm gì đó", session=None)  # type: ignore[arg-type]

    assert result == "ok"
    assert [t.slug for t in seen_tools] == ["weather-lookup"]
