from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.repository import AgentRepository
from app.modules.knowledge_base.repository import KnowledgeBaseRepository
from app.modules.knowledge_base.service import KnowledgeBaseService
from app.modules.model.repository import ModelRepository


def get_kb_service(session: Annotated[AsyncSession, Depends(get_session)]) -> KnowledgeBaseService:
    return KnowledgeBaseService(
        KnowledgeBaseRepository(session), ModelRepository(session), AgentRepository(session)
    )


KnowledgeBaseServiceDep = Annotated[KnowledgeBaseService, Depends(get_kb_service)]
