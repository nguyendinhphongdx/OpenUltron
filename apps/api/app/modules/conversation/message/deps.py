from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.conversation.message.repository import MessageRepository
from app.modules.conversation.message.service import MessageService


def get_message_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MessageService:
    return MessageService(MessageRepository(session))


MessageServiceDep = Annotated[MessageService, Depends(get_message_service)]
