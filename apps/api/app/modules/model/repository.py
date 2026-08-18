from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.model.models import Model


class ModelRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, **fields: object) -> Model:
        row = Model(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get(self, model_id: int) -> Model | None:
        return await self.session.get(Model, model_id)

    async def get_by_slug(self, slug: str) -> Model | None:
        stmt = select(Model).where(Model.slug == slug)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list(self) -> list[Model]:
        stmt = select(Model).order_by(Model.created_at.asc())
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete(self, row: Model) -> None:
        await self.session.delete(row)
