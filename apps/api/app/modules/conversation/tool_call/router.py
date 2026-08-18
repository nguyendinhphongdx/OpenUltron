from fastapi import APIRouter, status

from app.modules.conversation.tool_call.deps import ToolCallServiceDep
from app.modules.conversation.tool_call.schemas import (
    ToolCallComplete,
    ToolCallCreate,
    ToolCallRead,
)

router = APIRouter(
    prefix="/conversations/{conversation_id}/messages/{message_id}/tool-calls",
    tags=["tool-calls"],
)


@router.post("", response_model=ToolCallRead, status_code=status.HTTP_201_CREATED)
async def create_tool_call(
    conversation_id: int,
    message_id: int,
    body: ToolCallCreate,
    service: ToolCallServiceDep,
) -> ToolCallRead:
    return await service.create(message_id, body)


@router.patch("/{tool_call_id}", response_model=ToolCallRead)
async def complete_tool_call(
    conversation_id: int,
    message_id: int,
    tool_call_id: int,
    body: ToolCallComplete,
    service: ToolCallServiceDep,
) -> ToolCallRead:
    return await service.complete(tool_call_id, body)
