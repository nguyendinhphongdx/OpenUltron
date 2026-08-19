from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.deps import get_agent_service
from app.modules.agent.service import AgentService
from app.modules.knowledge_base.repository import KnowledgeBaseRepository
from app.modules.knowledge_base.service import KnowledgeBaseService
from app.modules.model.deps import get_model_service
from app.modules.model.service import ModelService


def get_kb_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    model_service: Annotated[ModelService, Depends(get_model_service)],
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
) -> KnowledgeBaseService:
    return KnowledgeBaseService(KnowledgeBaseRepository(session), model_service, agent_service)


KnowledgeBaseServiceDep = Annotated[KnowledgeBaseService, Depends(get_kb_service)]
