from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.conversation.tool_call.repository import ToolCallRepository
from app.modules.conversation.tool_call.service import ToolCallService


def get_tool_call_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ToolCallService:
    return ToolCallService(ToolCallRepository(session))


ToolCallServiceDep = Annotated[ToolCallService, Depends(get_tool_call_service)]
