"""`KnowledgeBaseService.unassign_from_agent` (agent-creation-wizard, 2026-08-30) — đối xứng
`ToolService.unassign_from_agent`, raise `ResourceNotFoundError` (không phải `HTTPException`) khi
chưa từng gán."""

import pytest

from app.core.errors import ResourceNotFoundError
from app.modules.knowledge_base.service import KnowledgeBaseService


class FakeRepo:
    def __init__(self, *, removed: bool) -> None:
        self._removed = removed
        self.calls: list[tuple[int, int]] = []

    async def remove_agent_kb(self, agent_id: int, kb_id: int) -> bool:
        self.calls.append((agent_id, kb_id))
        return self._removed


def _make_service(repo: FakeRepo) -> KnowledgeBaseService:
    return KnowledgeBaseService(repo, model_service=None, agent_service=None)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_unassign_from_agent_removes_existing_row() -> None:
    repo = FakeRepo(removed=True)
    service = _make_service(repo)

    await service.unassign_from_agent(1, 2)

    assert repo.calls == [(1, 2)]


@pytest.mark.asyncio
async def test_unassign_from_agent_raises_not_found_when_never_assigned() -> None:
    repo = FakeRepo(removed=False)
    service = _make_service(repo)

    with pytest.raises(ResourceNotFoundError):
        await service.unassign_from_agent(1, 2)
