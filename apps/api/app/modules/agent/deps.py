from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.service import AgentService
from app.modules.conversation.message.repository import MessageRepository


def get_agent_service(session: Annotated[AsyncSession, Depends(get_session)]) -> AgentService:
    return AgentService(MessageRepository(session))


AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]
