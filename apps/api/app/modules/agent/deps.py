from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.readiness import AgentReadinessService
from app.modules.agent.repository import AgentRepository
from app.modules.agent.service import AgentService
from app.modules.credential.repository import CredentialRepository
from app.modules.credential.service import CredentialService
from app.modules.knowledge_base.repository import KnowledgeBaseRepository
from app.modules.knowledge_base.service import KnowledgeBaseService
from app.modules.model.repository import ModelRepository
from app.modules.model.service import ModelService
from app.modules.tool.repository import ToolRepository
from app.modules.tool.service import ToolService


def get_agent_service(session: Annotated[AsyncSession, Depends(get_session)]) -> AgentService:
    return AgentService(AgentRepository(session), ModelService(ModelRepository(session)))


AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]


def get_agent_readiness_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    agent_service: AgentServiceDep,
) -> AgentReadinessService:
    model_service = ModelService(ModelRepository(session))
    return AgentReadinessService(
        agent_service,
        model_service,
        CredentialService(CredentialRepository(session)),
        ToolService(ToolRepository(session), agent_service),
        KnowledgeBaseService(KnowledgeBaseRepository(session), model_service, agent_service),
    )


AgentReadinessServiceDep = Annotated[AgentReadinessService, Depends(get_agent_readiness_service)]
