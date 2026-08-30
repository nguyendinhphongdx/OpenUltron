from typing import Any

from pydantic import BaseModel, Field


class AgUiRunRequest(BaseModel):
    """Subset AG-UI `RunAgentInput` nhận từ `@ag-ui/client` `HttpAgent`.

    Giữ shape lỏng ở boundary vì AG-UI còn experimental; service chỉ đọc `runId`, `messages`
    và `resume`, các field còn lại pass-through cho client/runtime phía trước tự quản.
    """

    threadId: str
    runId: str
    messages: list[dict[str, Any]]
    resume: list[dict[str, Any]] | None = None
    state: Any = None
    tools: list[dict[str, Any]] = Field(default_factory=list)
    context: list[dict[str, Any]] = Field(default_factory=list)
    forwardedProps: dict[str, Any] = Field(default_factory=dict)
