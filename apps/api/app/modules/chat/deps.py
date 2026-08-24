from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.deps import get_agent_service
from app.modules.agent.service import AgentService
from app.modules.chat.service import ChatService
from app.modules.conversation.deps import get_conversation_service
from app.modules.conversation.message.deps import get_message_service
from app.modules.conversation.message.service import MessageService
from app.modules.conversation.service import ConversationService
from app.modules.model.deps import get_model_service
from app.modules.model.service import ModelService
from app.modules.settings.deps import get_settings_service
from app.modules.settings.service import SettingsService
from app.modules.tool.deps import get_tool_service
from app.modules.tool.service import ToolService


def get_chat_service(
    conversation_service: Annotated[ConversationService, Depends(get_conversation_service)],
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
    model_service: Annotated[ModelService, Depends(get_model_service)],
    settings_service: Annotated[SettingsService, Depends(get_settings_service)],
    message_service: Annotated[MessageService, Depends(get_message_service)],
    tool_service: Annotated[ToolService, Depends(get_tool_service)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ChatService:
    return ChatService(
        conversation_service,
        agent_service,
        model_service,
        settings_service,
        message_service,
        tool_service,
        session,
    )


ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
