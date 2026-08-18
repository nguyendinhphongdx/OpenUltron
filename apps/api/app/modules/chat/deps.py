from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.repository import AgentRepository
from app.modules.chat.service import ChatService
from app.modules.conversation.message.repository import MessageRepository
from app.modules.conversation.repository import ConversationRepository
from app.modules.model.repository import ModelRepository
from app.modules.settings.repository import SettingsRepository


def get_chat_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ChatService:
    return ChatService(
        ConversationRepository(session),
        AgentRepository(session),
        ModelRepository(session),
        SettingsRepository(session),
        MessageRepository(session),
    )


ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
