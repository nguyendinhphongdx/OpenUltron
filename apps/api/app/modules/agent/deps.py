from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.repository import AgentRepository
from app.modules.agent.service import AgentService
from app.modules.model.repository import ModelRepository
from app.modules.model.service import ModelService


def get_agent_service(session: Annotated[AsyncSession, Depends(get_session)]) -> AgentService:
    return AgentService(AgentRepository(session), ModelService(ModelRepository(session)))


AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]
