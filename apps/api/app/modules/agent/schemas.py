import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{1,79}$")

ExecutionStrategy = Literal["react", "plan_execute"]


class AgentCreate(BaseModel):
    slug: str
    name: str
    description: str | None = None
    system_prompt: str
    model_id: int
    is_orchestrator: bool = False
    # ADR-0021 — chỉ có ý nghĩa khi agent chạy như top-level (chat trực tiếp/orchestrator gốc);
    # khi agent này được dùng làm sub-agent, field bị bỏ qua (`SubAgentSpec` không đọc), luôn chạy
    # `react`. Mặc định "react" giữ nguyên hành vi cũ.
    execution_strategy: ExecutionStrategy = "react"

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not SLUG_PATTERN.match(v):
            raise ValueError("slug chỉ gồm chữ thường/số/-/_, 2-80 ký tự")
        return v


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    model_id: int | None = None
    is_orchestrator: bool | None = None
    execution_strategy: ExecutionStrategy | None = None
    # Vị trí node của agent này khi nó là GỐC canvas orchestrator của chính nó
    # (docs/features/orchestrator-v2.md Phase C) — tái dùng `PATCH /agents/{id}` có sẵn (đã
    # `exclude_unset` ở `AgentService.update`) thay vì tạo route/schema riêng cho "layout".
    pos_x: float | None = None
    pos_y: float | None = None


class AgentRead(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    system_prompt: str
    model_id: int
    is_orchestrator: bool
    execution_strategy: ExecutionStrategy
    pos_x: float | None
    pos_y: float | None
    created_at: datetime
    updated_at: datetime


class AgentDelegationCreate(BaseModel):
    sub_agent_id: int
    task_description: str | None = None


class AgentDelegationUpdate(BaseModel):
    """Partial update — chỉ field THẬT SỰ có mặt trong request mới được áp dụng (đọc qua
    `model_dump(exclude_unset=True)` ở `AgentService.update_delegation`). Bắt buộc vì `pos_x`/
    `pos_y` (kéo node liên tục) và `task_description` (sửa qua panel) là 2 chỗ gọi độc lập — không
    dùng `exclude_unset` thì mỗi lần kéo node sẽ vô tình gửi `task_description=None`, xoá mất mô tả
    đã lưu."""

    task_description: str | None = None
    pos_x: float | None = None
    pos_y: float | None = None


class AgentDelegationRead(BaseModel):
    id: int
    orchestrator_agent_id: int
    sub_agent_id: int
    task_description: str | None
    pos_x: float | None
    pos_y: float | None
    last_run_at: datetime | None
    last_run_output: str | None
    last_run_error: str | None
    last_run_duration_ms: int | None


class AgentDelegationDetailRead(BaseModel):
    """Edge + sub-agent lồng (dùng cho canvas hiển thị + `ChatService` resolve edge contract) —
    khác `AgentDelegationRead` (chỉ id trần) vì cần cả `task_description` lẫn `AgentRead` đầy đủ
    của sub-agent trong 1 lần gọi (tránh N+1 round-trip)."""

    id: int
    orchestrator_agent_id: int
    sub_agent_id: int
    task_description: str | None
    pos_x: float | None
    pos_y: float | None
    last_run_at: datetime | None
    last_run_output: str | None
    last_run_error: str | None
    last_run_duration_ms: int | None
    sub_agent: AgentRead


class AgentNodeReadiness(BaseModel):
    """Kết quả readiness check cho 1 agent (node) trong graph — `docs/features/orchestrator-v2.md`
    Phase B. `issues` rỗng khi `ready=True`."""

    agent_id: int
    ready: bool
    issues: list[str]


class AgentReadinessRead(BaseModel):
    """Readiness toàn graph — 1 entry / agent unique (dedupe theo `agent_id`, xem
    `AgentReadinessService.check`)."""

    nodes: list[AgentNodeReadiness]
