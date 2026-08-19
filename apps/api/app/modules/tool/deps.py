from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.deps import get_agent_service
from app.modules.agent.service import AgentService
from app.modules.tool.repository import ToolRepository
from app.modules.tool.service import ToolService


def get_tool_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
) -> ToolService:
    return ToolService(ToolRepository(session), agent_service)


ToolServiceDep = Annotated[ToolService, Depends(get_tool_service)]
