from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.modules.conversation.models import ToolCall
from app.modules.conversation.tool_call.repository import ToolCallRepository
from app.modules.conversation.tool_call.schemas import (
    ToolCallComplete,
    ToolCallCreate,
    ToolCallRead,
)


def _to_read(row: ToolCall) -> ToolCallRead:
    return ToolCallRead(
        id=row.id,
        message_id=row.message_id,
        tool_name=row.tool_name,
        arguments=row.arguments,
        result=row.result,
        status=row.status,
        started_at=row.started_at,
        ended_at=row.ended_at,
        latency_seconds=row.latency_seconds,
        error=row.error,
    )


class ToolCallService:
    def __init__(self, repo: ToolCallRepository) -> None:
        self.repo = repo

    async def create(self, message_id: int, input: ToolCallCreate) -> ToolCallRead:
        row = await self.repo.create(
            message_id=message_id,
            tool_name=input.tool_name,
            arguments=input.arguments,
            status="pending",
        )
        return _to_read(row)

    async def complete(self, tool_call_id: int, input: ToolCallComplete) -> ToolCallRead:
        row = await self.repo.get(tool_call_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ToolCall {tool_call_id} không tồn tại",
            )
        row.status = input.status
        row.result = input.result
        row.error = input.error
        row.latency_seconds = input.latency_seconds
        row.ended_at = datetime.now(UTC)
        return _to_read(row)
