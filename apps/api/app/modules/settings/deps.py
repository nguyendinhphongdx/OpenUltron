from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agent.repository import AgentRepository
from app.modules.model.repository import ModelRepository
from app.modules.settings.repository import SettingsRepository
from app.modules.settings.service import SettingsService


def get_settings_service(session: Annotated[AsyncSession, Depends(get_session)]) -> SettingsService:
    return SettingsService(
        SettingsRepository(session), ModelRepository(session), AgentRepository(session)
    )


SettingsServiceDep = Annotated[SettingsService, Depends(get_settings_service)]
