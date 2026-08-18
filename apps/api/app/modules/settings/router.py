from fastapi import APIRouter

from app.modules.settings.deps import SettingsServiceDep
from app.modules.settings.schemas import AppSettingsRead, AppSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=AppSettingsRead)
async def get_settings(service: SettingsServiceDep) -> AppSettingsRead:
    return await service.get()


@router.patch("", response_model=AppSettingsRead)
async def update_settings(body: AppSettingsUpdate, service: SettingsServiceDep) -> AppSettingsRead:
    return await service.update(body)
