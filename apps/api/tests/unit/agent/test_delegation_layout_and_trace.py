"""Orchestrator v2 Phase C (docs/features/orchestrator-v2.md) — `update_delegation` phải là
partial update thật (`exclude_unset`, không xoá field không được gửi), `record_delegation_run` ghi
đúng "lần chạy gần nhất" hoặc no-op khi delegation không tồn tại. Unit test thuần (03-testing.md)
— Fake repo, không cần DB."""

from types import SimpleNamespace

import pytest

from app.core.errors import ResourceNotFoundError
from app.modules.agent.schemas import AgentDelegationUpdate
from app.modules.agent.service import AgentService


def _delegation(**overrides: object) -> SimpleNamespace:
    defaults = dict(
        id=1,
        orchestrator_agent_id=10,
        sub_agent_id=20,
        task_description="mô tả cũ",
        pos_x=None,
        pos_y=None,
        last_run_at=None,
        last_run_output=None,
        last_run_error=None,
        last_run_duration_ms=None,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class FakeRepo:
    def __init__(self, delegation: SimpleNamespace | None) -> None:
        self._delegation = delegation

    async def get_delegation(self, orchestrator_agent_id: int, sub_agent_id: int):
        return self._delegation

    async def get_delegation_by_id(self, delegation_id: int):
        if self._delegation is not None and self._delegation.id == delegation_id:
            return self._delegation
        return None


def _service(delegation: SimpleNamespace | None) -> AgentService:
    return AgentService(FakeRepo(delegation), model_service=None)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_update_delegation_partial_update_keeps_unset_fields() -> None:
    """Chỉ gửi pos_x/pos_y (drag node) — task_description đã có KHÔNG bị xoá."""
    row = _delegation(task_description="mô tả cũ")
    service = _service(row)

    result = await service.update_delegation(10, 20, AgentDelegationUpdate(pos_x=1.5, pos_y=2.5))

    assert result.task_description == "mô tả cũ"
    assert result.pos_x == 1.5
    assert result.pos_y == 2.5


@pytest.mark.asyncio
async def test_update_delegation_can_still_clear_task_description() -> None:
    """Gửi `task_description=None` tường minh — vẫn xoá được (khác "không gửi field")."""
    row = _delegation(task_description="mô tả cũ")
    service = _service(row)

    result = await service.update_delegation(10, 20, AgentDelegationUpdate(task_description=None))

    assert result.task_description is None


@pytest.mark.asyncio
async def test_update_delegation_raises_not_found_when_missing() -> None:
    service = _service(None)

    with pytest.raises(ResourceNotFoundError):
        await service.update_delegation(10, 20, AgentDelegationUpdate(pos_x=1.0, pos_y=1.0))


@pytest.mark.asyncio
async def test_record_delegation_run_writes_success_fields() -> None:
    row = _delegation()
    service = _service(row)

    await service.record_delegation_run(1, output="kết quả tốt", error=None, duration_ms=250)

    assert row.last_run_output == "kết quả tốt"
    assert row.last_run_error is None
    assert row.last_run_duration_ms == 250
    assert row.last_run_at is not None


@pytest.mark.asyncio
async def test_record_delegation_run_writes_error_fields() -> None:
    row = _delegation()
    service = _service(row)

    await service.record_delegation_run(1, output=None, error="tool lỗi", duration_ms=50)

    assert row.last_run_output is None
    assert row.last_run_error == "tool lỗi"


@pytest.mark.asyncio
async def test_record_delegation_run_noop_when_delegation_missing() -> None:
    service = _service(None)

    # Không raise — ghi trace lỗi không được phép làm hỏng turn chat đang chạy.
    await service.record_delegation_run(999, output="x", error=None, duration_ms=10)
