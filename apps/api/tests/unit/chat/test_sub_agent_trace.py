"""Orchestrator v2 Phase C (docs/features/orchestrator-v2.md) — `_build_sub_agent_tool` phải ghi
"lần chạy gần nhất" của cạnh delegation (`SubAgentSpec.delegation_id`) sau mỗi lần gọi, cả nhánh
thành công lẫn lỗi — và KHÔNG ghi gì khi `delegation_id=None` (resolve ngoài context 1 cạnh cụ
thể). Unit test thuần — monkeypatch `run_sub_agent` + `AgentService.record_delegation_run`."""

import pytest

import app.modules.agent.service as agent_service_module
import app.modules.chat.graph as graph_module
from app.modules.chat.graph import ModelConfig, SubAgentSpec, _build_sub_agent_tool


def _spec(*, delegation_id: int | None) -> SubAgentSpec:
    return SubAgentSpec(
        slug="research-agent",
        description=None,
        system_prompt="you are a researcher",
        model=ModelConfig(provider="ollama", model_id="test-model"),
        delegation_id=delegation_id,
    )


@pytest.mark.asyncio
async def test_records_success_run_when_delegation_id_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict] = []

    async def fake_run_sub_agent(sub_agent, task, *, session, depth=0):
        return "kết quả tốt"

    async def fake_record_delegation_run(self, delegation_id, *, output, error, duration_ms):
        calls.append({"delegation_id": delegation_id, "output": output, "error": error})

    monkeypatch.setattr(graph_module, "run_sub_agent", fake_run_sub_agent)
    monkeypatch.setattr(
        agent_service_module.AgentService, "record_delegation_run", fake_record_delegation_run
    )

    tool = _build_sub_agent_tool(_spec(delegation_id=42), session=None)  # type: ignore[arg-type]
    result = await tool.ainvoke({"task": "làm gì đó"})

    assert result == "kết quả tốt"
    assert calls == [{"delegation_id": 42, "output": "kết quả tốt", "error": None}]


@pytest.mark.asyncio
async def test_records_error_run_and_still_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[dict] = []

    async def fake_run_sub_agent(sub_agent, task, *, session, depth=0):
        raise RuntimeError("sub-agent lỗi thật")

    async def fake_record_delegation_run(self, delegation_id, *, output, error, duration_ms):
        calls.append({"delegation_id": delegation_id, "output": output, "error": error})

    monkeypatch.setattr(graph_module, "run_sub_agent", fake_run_sub_agent)
    monkeypatch.setattr(
        agent_service_module.AgentService, "record_delegation_run", fake_record_delegation_run
    )

    tool = _build_sub_agent_tool(_spec(delegation_id=42), session=None)  # type: ignore[arg-type]

    # `@tool` (LangChain) mặc định KHÔNG bọc `handle_tool_error` cho tool này (xem
    # `_build_sub_agent_tool` — không truyền `handle_tool_error=True`), nên lỗi vẫn propagate.
    with pytest.raises(Exception):
        await tool.ainvoke({"task": "làm gì đó"})

    assert calls == [{"delegation_id": 42, "output": None, "error": "sub-agent lỗi thật"}]


@pytest.mark.asyncio
async def test_no_trace_recorded_when_delegation_id_is_none(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict] = []

    async def fake_run_sub_agent(sub_agent, task, *, session, depth=0):
        return "ok"

    async def fake_record_delegation_run(self, delegation_id, *, output, error, duration_ms):
        calls.append({"delegation_id": delegation_id})

    monkeypatch.setattr(graph_module, "run_sub_agent", fake_run_sub_agent)
    monkeypatch.setattr(
        agent_service_module.AgentService, "record_delegation_run", fake_record_delegation_run
    )

    tool = _build_sub_agent_tool(_spec(delegation_id=None), session=None)  # type: ignore[arg-type]
    await tool.ainvoke({"task": "làm gì đó"})

    assert calls == []
