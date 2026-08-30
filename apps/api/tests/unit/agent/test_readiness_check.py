"""`AgentReadinessService.check` — BFS/dedupe thuần (docs/features/orchestrator-v2.md Phase B).
Unit test, Fake service cho cả 5 dependency — không cần DB (03-testing.md)."""

from types import SimpleNamespace

import pytest

from app.modules.agent.readiness import AgentReadinessService


def _agent(agent_id: int, *, model_id: int, is_orchestrator: bool = False) -> SimpleNamespace:
    return SimpleNamespace(id=agent_id, model_id=model_id, is_orchestrator=is_orchestrator)


def _model(*, provider: str) -> SimpleNamespace:
    return SimpleNamespace(provider=provider)


class FakeAgentService:
    def __init__(self, agents: dict[int, SimpleNamespace], edges: dict[int, list[int]]) -> None:
        self._agents = agents
        self._edges = edges  # orchestrator_agent_id -> [sub_agent_id]

    async def find(self, agent_id: int) -> SimpleNamespace | None:
        return self._agents.get(agent_id)

    async def list_sub_agents(self, orchestrator_agent_id: int) -> list[SimpleNamespace]:
        return [self._agents[sid] for sid in self._edges.get(orchestrator_agent_id, [])]


class FakeModelService:
    def __init__(self, models: dict[int, SimpleNamespace]) -> None:
        self._models = models

    async def find(self, model_id: int) -> SimpleNamespace | None:
        return self._models.get(model_id)


class FakeCredentialService:
    def __init__(self, valid_providers: set[str], missing_providers: set[str]) -> None:
        self._valid_providers = valid_providers
        self._missing_providers = missing_providers

    async def find_by_provider(self, provider: str) -> SimpleNamespace | None:
        if provider in self._missing_providers:
            return None
        return SimpleNamespace(is_valid=provider in self._valid_providers)


class FakeToolService:
    def __init__(self, tools_by_agent: dict[int, list[SimpleNamespace]]) -> None:
        self._tools_by_agent = tools_by_agent

    async def list_for_agent(self, agent_id: int) -> list[SimpleNamespace]:
        return self._tools_by_agent.get(agent_id, [])


class FakeKbService:
    def __init__(
        self,
        kbs_by_agent: dict[int, list[SimpleNamespace]],
        stats_by_kb: dict[int, SimpleNamespace],
    ) -> None:
        self._kbs_by_agent = kbs_by_agent
        self._stats_by_kb = stats_by_kb

    async def list_for_agent(self, agent_id: int) -> list[SimpleNamespace]:
        return self._kbs_by_agent.get(agent_id, [])

    async def get_stats(self, kb_id: int) -> SimpleNamespace:
        return self._stats_by_kb[kb_id]


def _make_service(
    *,
    agents: dict[int, SimpleNamespace],
    edges: dict[int, list[int]] | None = None,
    models: dict[int, SimpleNamespace] | None = None,
    valid_providers: set[str] | None = None,
    missing_providers: set[str] | None = None,
    tools_by_agent: dict[int, list[SimpleNamespace]] | None = None,
    kbs_by_agent: dict[int, list[SimpleNamespace]] | None = None,
    stats_by_kb: dict[int, SimpleNamespace] | None = None,
) -> AgentReadinessService:
    return AgentReadinessService(
        FakeAgentService(agents, edges or {}),  # type: ignore[arg-type]
        FakeModelService(models or {}),  # type: ignore[arg-type]
        FakeCredentialService(valid_providers or set(), missing_providers or set()),  # type: ignore[arg-type]
        FakeToolService(tools_by_agent or {}),  # type: ignore[arg-type]
        FakeKbService(kbs_by_agent or {}, stats_by_kb or {}),  # type: ignore[arg-type]
    )


@pytest.mark.asyncio
async def test_agent_ready_when_no_issues() -> None:
    service = _make_service(
        agents={1: _agent(1, model_id=10)},
        models={10: _model(provider="ollama")},
    )

    result = await service.check(1)

    assert len(result.nodes) == 1
    assert result.nodes[0].agent_id == 1
    assert result.nodes[0].ready is True
    assert result.nodes[0].issues == []


@pytest.mark.asyncio
async def test_missing_model_is_flagged() -> None:
    service = _make_service(agents={1: _agent(1, model_id=999)}, models={})

    result = await service.check(1)

    assert result.nodes[0].ready is False
    assert "Model không tồn tại" in result.nodes[0].issues


@pytest.mark.asyncio
async def test_missing_credential_is_flagged_for_provider_requiring_it() -> None:
    service = _make_service(
        agents={1: _agent(1, model_id=10)},
        models={10: _model(provider="gemini")},
        missing_providers={"gemini"},
    )

    result = await service.check(1)

    assert result.nodes[0].ready is False
    assert any("credential" in issue.lower() for issue in result.nodes[0].issues)


@pytest.mark.asyncio
async def test_invalid_credential_is_flagged() -> None:
    service = _make_service(
        agents={1: _agent(1, model_id=10)},
        models={10: _model(provider="gemini")},
        valid_providers=set(),  # credential tồn tại nhưng is_valid=False
    )

    result = await service.check(1)

    assert result.nodes[0].ready is False
    assert any("không hợp lệ" in issue for issue in result.nodes[0].issues)


@pytest.mark.asyncio
async def test_self_host_provider_does_not_require_credential() -> None:
    service = _make_service(
        agents={1: _agent(1, model_id=10)},
        models={10: _model(provider="ollama")},
    )

    result = await service.check(1)

    assert result.nodes[0].ready is True


@pytest.mark.asyncio
async def test_tool_config_error_is_flagged() -> None:
    bad_tool = SimpleNamespace(slug="broken-http-tool", kind="http", config={})
    service = _make_service(
        agents={1: _agent(1, model_id=10)},
        models={10: _model(provider="ollama")},
        tools_by_agent={1: [bad_tool]},
    )

    result = await service.check(1)

    assert result.nodes[0].ready is False
    assert any("broken-http-tool" in issue for issue in result.nodes[0].issues)


@pytest.mark.asyncio
async def test_empty_knowledge_base_is_flagged() -> None:
    empty_kb = SimpleNamespace(id=100, slug="empty-kb")
    service = _make_service(
        agents={1: _agent(1, model_id=10)},
        models={10: _model(provider="ollama")},
        kbs_by_agent={1: [empty_kb]},
        stats_by_kb={100: SimpleNamespace(total_chunks=0)},
    )

    result = await service.check(1)

    assert result.nodes[0].ready is False
    assert any("rỗng" in issue for issue in result.nodes[0].issues)


@pytest.mark.asyncio
async def test_non_empty_knowledge_base_is_not_flagged() -> None:
    kb = SimpleNamespace(id=100, slug="kb")
    service = _make_service(
        agents={1: _agent(1, model_id=10)},
        models={10: _model(provider="ollama")},
        kbs_by_agent={1: [kb]},
        stats_by_kb={100: SimpleNamespace(total_chunks=5)},
    )

    result = await service.check(1)

    assert result.nodes[0].ready is True


@pytest.mark.asyncio
async def test_recurses_through_multiple_orchestrator_tiers_and_dedupes() -> None:
    """Orchestrator A -> B (orchestrator) -> C, và A cũng gọi trực tiếp C (nhiều tầng + 1
    sub-agent được gọi bởi nhiều orchestrator, ADR-0006 many-to-many) — C chỉ xuất hiện 1 lần
    trong kết quả."""
    agents = {
        1: _agent(1, model_id=10, is_orchestrator=True),
        2: _agent(2, model_id=10, is_orchestrator=True),
        3: _agent(3, model_id=999),  # model không tồn tại — issue
    }
    edges = {1: [2, 3], 2: [3]}
    models = {10: _model(provider="ollama")}
    service = _make_service(agents=agents, edges=edges, models=models)

    result = await service.check(1)

    assert sorted(n.agent_id for n in result.nodes) == [1, 2, 3]
    node_by_id = {n.agent_id: n for n in result.nodes}
    assert node_by_id[1].ready is True
    assert node_by_id[2].ready is True
    assert node_by_id[3].ready is False
    assert "Model không tồn tại" in node_by_id[3].issues
