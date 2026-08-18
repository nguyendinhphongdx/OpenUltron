from datetime import datetime

from pydantic import BaseModel


class AppSettingsUpdate(BaseModel):
    default_model_id: int | None = None
    default_agent_id: int | None = None


class AppSettingsRead(BaseModel):
    default_model_id: int | None
    default_agent_id: int | None
    updated_at: datetime
