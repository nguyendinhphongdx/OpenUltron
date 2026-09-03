"""Edge contract (docs/features/orchestrator-v2.md Phase B) — `ChatService._resolve_sub_agent_spec`
phải ưu tiên `task_description` (mô tả riêng theo cạnh `AgentDelegation`) trước `agent.description`
(mô tả chung), rồi mới tới default cứng ở `chat/graph.py::_build_sub_agent_tool` khi cả 2 đều
None. Unit test thuần (03-testing.md) — Fake service, không cần DB (cùng pattern
`tests/unit/chat/test_chat_service.py`)."""

from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.modules.agent.schemas import AgentRead
from app.modules.chat.graph import _build_sub_agent_tool
from app.modules.chat.service import ChatService


class FakeModelService:
    async def get_or_404(self, model_id: int) -> SimpleNamespace:
        return SimpleNamespace(provider="ollama", model_id="test-model", base_url=None)


class FakeToolService:
    async def list_for_agent(self, agent_id: int) -> list:
        return []


class FakeKbService:
    async def list_for_agent(self, agent_id: int) -> list:
        return []


class FakeToolCallService:
    pass


def _agent(*, description: str | None) -> AgentRead:
    return AgentRead(
        id=1,
        slug="research-agent",
        name="Research Agent",
        description=description,
        system_prompt="you are a researcher",
        model_id=1,
        is_orchestrator=False,
        execution_strategy="react",
        pos_x=None,
        pos_y=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _make_service() -> ChatService:
    return ChatService(
        conversation_service=None,  # type: ignore[arg-type]
        agent_service=None,  # type: ignore[arg-type]
        model_service=FakeModelService(),  # type: ignore[arg-type]
        settings_service=None,  # type: ignore[arg-type]
        message_service=None,  # type: ignore[arg-type]
        tool_service=FakeToolService(),  # type: ignore[arg-type]
        kb_service=FakeKbService(),  # type: ignore[arg-type]
        tool_call_service=FakeToolCallService(),  # type: ignore[arg-type]
        session=None,  # type: ignore[arg-type]
    )


@pytest.mark.asyncio
async def test_resolve_sub_agent_spec_prefers_edge_task_description() -> None:
    agent = _agent(description="mô tả chung của agent")
    service = _make_service()

    spec = await service._resolve_sub_agent_spec(agent, "mô tả riêng theo cạnh này")

    assert spec.description == "mô tả riêng theo cạnh này"


@pytest.mark.asyncio
async def test_resolve_sub_agent_spec_falls_back_to_agent_description() -> None:
    agent = _agent(description="mô tả chung của agent")
    service = _make_service()

    spec = await service._resolve_sub_agent_spec(agent, None)

    assert spec.description == "mô tả chung của agent"


@pytest.mark.asyncio
async def test_resolve_sub_agent_spec_none_when_both_missing() -> None:
    agent = _agent(description=None)
    service = _make_service()

    spec = await service._resolve_sub_agent_spec(agent, None)

    assert spec.description is None
    # Default cứng cuối cùng (`f"Delegate task to '{slug}'"`) nằm ở `chat/graph.py`, không phải
    # `ChatService` — xác nhận tool build từ spec này vẫn có description hợp lý.
    tool = _build_sub_agent_tool(spec, session=None)  # type: ignore[arg-type]
    assert tool.description == f"Delegate task to '{spec.slug}'"
