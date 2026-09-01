"""ADR-0021 — graph `plan_execute` (StateGraph tự build, khác `create_agent`) chạy đúng: sinh plan
→ thực thi tuần tự từng bước (tự lặp ReAct model⇄tools trong 1 bước nếu cần) → tổng hợp câu trả
lời cuối. `get_checkpointer()` monkeypatch về `None` (không cần Postgres thật — `StateGraph.compile
(checkpointer=None)` là ephemeral run hợp lệ, đủ để test logic node/edge)."""

import pytest
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.tools import tool as lc_tool

import app.modules.chat.graph as graph_module
from app.modules.chat.graph import ModelConfig, _PlanOutput, build_plan_execute_executor
from app.modules.tool.builder import ToolSpec


def _spec(slug: str, kind: str = "http") -> ToolSpec:
    return ToolSpec(id=1, slug=slug, name=slug, description=None, kind=kind, config=None)


@pytest.mark.asyncio
async def test_plan_execute_runs_plan_then_synthesizes(monkeypatch: pytest.MonkeyPatch) -> None:
    call_count = {"n": 0}

    class _FakeStructuredModel:
        async def ainvoke(self, messages: object) -> _PlanOutput:
            return _PlanOutput(steps=["bước 1", "bước 2"])

    class _FakeChatModel:
        def with_structured_output(self, schema: object) -> _FakeStructuredModel:
            return _FakeStructuredModel()

        async def ainvoke(self, messages: object) -> AIMessage:
            call_count["n"] += 1
            if call_count["n"] <= 2:
                return AIMessage(content=f"kết quả bước {call_count['n']}")
            return AIMessage(content="câu trả lời cuối cùng")

    async def fake_build_chat_model(**kwargs: object) -> _FakeChatModel:
        return _FakeChatModel()

    monkeypatch.setattr(graph_module, "build_chat_model", fake_build_chat_model)
    monkeypatch.setattr(graph_module, "get_checkpointer", lambda: None)

    executor = await build_plan_execute_executor(
        system_prompt="you are a helpful agent",
        model=ModelConfig(provider="ollama", model_id="test-model"),
        sub_agents=[],
        tools=[],
        knowledge_bases=[],
        session=None,  # type: ignore[arg-type]
    )

    result = await executor.ainvoke(
        {"messages": [HumanMessage(content="làm ơn giúp tôi")]},
        config={"configurable": {"thread_id": "test-thread"}},
    )

    assert result["plan"] == ["bước 1", "bước 2"]
    assert result["step_results"] == ["kết quả bước 1", "kết quả bước 2"]
    assert result["current_step"] == 2
    assert result["messages"][-1].content == "câu trả lời cuối cùng"


@pytest.mark.asyncio
async def test_plan_execute_step_loops_tool_call_before_advancing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    @lc_tool
    def lookup(query: str) -> str:
        """Tra cứu 1 thông tin."""
        return f"found: {query}"

    async def fake_build_tools(tools: list[ToolSpec], *, session: object) -> list:
        return [lookup]

    model_calls = {"n": 0}

    class _FakeStructuredModel:
        async def ainvoke(self, messages: object) -> _PlanOutput:
            return _PlanOutput(steps=["chỉ 1 bước"])

    class _FakeChatModel:
        def with_structured_output(self, schema: object) -> _FakeStructuredModel:
            return _FakeStructuredModel()

        def bind_tools(self, tools: list) -> "_FakeChatModel":
            return self

        async def ainvoke(self, messages: object) -> AIMessage:
            model_calls["n"] += 1
            if model_calls["n"] == 1:
                return AIMessage(
                    content="",
                    tool_calls=[{"name": "lookup", "args": {"query": "abc"}, "id": "call-1"}],
                )
            if model_calls["n"] == 2:
                return AIMessage(content="đã có kết quả")
            return AIMessage(content="tổng hợp xong")

    async def fake_build_chat_model(**kwargs: object) -> _FakeChatModel:
        return _FakeChatModel()

    monkeypatch.setattr(graph_module, "build_chat_model", fake_build_chat_model)
    monkeypatch.setattr(graph_module, "build_tools", fake_build_tools)
    monkeypatch.setattr(graph_module, "get_checkpointer", lambda: None)

    executor = await build_plan_execute_executor(
        system_prompt="you are a helpful agent",
        model=ModelConfig(provider="ollama", model_id="test-model"),
        sub_agents=[],
        tools=[_spec("lookup")],
        knowledge_bases=[],
        session=None,  # type: ignore[arg-type]
    )

    result = await executor.ainvoke(
        {"messages": [HumanMessage(content="cần tra cứu abc")]},
        config={"configurable": {"thread_id": "test-thread-2"}},
    )

    assert result["step_results"] == ["đã có kết quả"]
    assert result["messages"][-1].content == "tổng hợp xong"
    assert model_calls["n"] == 3
