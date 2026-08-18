from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.conversation.repository import ConversationRepository
from app.modules.conversation.service import ConversationService


def get_conversation_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ConversationService:
    return ConversationService(ConversationRepository(session))


ConversationServiceDep = Annotated[ConversationService, Depends(get_conversation_service)]
