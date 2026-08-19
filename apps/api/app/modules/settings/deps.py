from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.deps import get_agent_service
from app.modules.agent.service import AgentService
from app.modules.model.deps import get_model_service
from app.modules.model.service import ModelService
from app.modules.settings.repository import SettingsRepository
from app.modules.settings.service import SettingsService


def get_settings_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    model_service: Annotated[ModelService, Depends(get_model_service)],
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
) -> SettingsService:
    return SettingsService(SettingsRepository(session), model_service, agent_service)


SettingsServiceDep = Annotated[SettingsService, Depends(get_settings_service)]
