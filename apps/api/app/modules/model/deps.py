from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.model.repository import ModelRepository
from app.modules.model.service import ModelService


def get_model_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ModelService:
    return ModelService(ModelRepository(session))


ModelServiceDep = Annotated[ModelService, Depends(get_model_service)]
