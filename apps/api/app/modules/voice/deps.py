from typing import Annotated

from fastapi import Depends

from app.modules.chat.deps import get_chat_service
from app.modules.chat.service import ChatService
from app.modules.voice.service import VoiceService


def get_voice_service(
    chat_service: Annotated[ChatService, Depends(get_chat_service)],
) -> VoiceService:
    return VoiceService(chat_service)


VoiceServiceDep = Annotated[VoiceService, Depends(get_voice_service)]
