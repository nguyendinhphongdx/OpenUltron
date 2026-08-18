from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.repository import AgentRepository
from app.modules.tool.repository import ToolRepository
from app.modules.tool.service import ToolService


def get_tool_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ToolService:
    return ToolService(ToolRepository(session), AgentRepository(session))


ToolServiceDep = Annotated[ToolService, Depends(get_tool_service)]
