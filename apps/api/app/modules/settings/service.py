from __future__ import annotations

from app.core.errors import ValidationFailedError
from app.modules.agent.service import AgentService
from app.modules.model.service import ModelService
from app.modules.settings.models import AppSettings
from app.modules.settings.repository import SettingsRepository
from app.modules.settings.schemas import AppSettingsRead, AppSettingsUpdate


def settings_to_read(row: AppSettings) -> AppSettingsRead:
    return AppSettingsRead(
        default_model_id=row.default_model_id,
        default_agent_id=row.default_agent_id,
        updated_at=row.updated_at,
    )


class SettingsService:
    def __init__(
        self, repo: SettingsRepository, model_service: ModelService, agent_service: AgentService
    ) -> None:
        self.repo = repo
        self.model_service = model_service
        self.agent_service = agent_service

    async def get(self) -> AppSettingsRead:
        return settings_to_read(await self.repo.get_or_create())

    async def update(self, input: AppSettingsUpdate) -> AppSettingsRead:
        if (
            input.default_model_id is not None
            and await self.model_service.find(input.default_model_id) is None
        ):
            raise ValidationFailedError(f"Model {input.default_model_id} không tồn tại")
        if (
            input.default_agent_id is not None
            and await self.agent_service.find(input.default_agent_id) is None
        ):
            raise ValidationFailedError(f"Agent {input.default_agent_id} không tồn tại")
        row = await self.repo.get_or_create()
        for field, value in input.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        return settings_to_read(row)
