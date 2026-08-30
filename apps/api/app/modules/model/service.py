from __future__ import annotations

from app.core.errors import ConflictError, ResourceNotFoundError
from app.core.model_catalog import get_capabilities
from app.modules.model.models import Model
from app.modules.model.repository import ModelRepository
from app.modules.model.schemas import ModelCreate, ModelRead, ModelUpdate


def model_to_read(row: Model) -> ModelRead:
    return ModelRead(
        id=row.id,
        slug=row.slug,
        name=row.name,
        provider=row.provider,
        model_id=row.model_id,
        base_url=row.base_url,
        is_embedding=row.is_embedding,
        extra_config=row.extra_config,
        capabilities=get_capabilities(row.provider, row.model_id),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class ModelService:
    def __init__(self, repo: ModelRepository) -> None:
        self.repo = repo

    async def create(self, input: ModelCreate) -> ModelRead:
        if await self.repo.get_by_slug(input.slug) is not None:
            raise ConflictError(f"Model slug '{input.slug}' đã tồn tại")
        row = await self.repo.create(**input.model_dump())
        return model_to_read(row)

    async def list(self) -> list[ModelRead]:
        return [model_to_read(r) for r in await self.repo.list()]

    async def find(self, model_id: int) -> Model | None:
        """Existence check dùng bởi service module khác (không import ModelRepository trực tiếp)."""
        return await self.repo.get(model_id)

    async def get_or_404(self, model_id: int) -> Model:
        row = await self.find(model_id)
        if row is None:
            raise ResourceNotFoundError("Model", model_id)
        return row

    async def get(self, model_id: int) -> ModelRead:
        return model_to_read(await self.get_or_404(model_id))

    async def update(self, model_id: int, input: ModelUpdate) -> ModelRead:
        row = await self.get_or_404(model_id)
        for field, value in input.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        return model_to_read(row)

    async def remove(self, model_id: int) -> None:
        row = await self.get_or_404(model_id)
        await self.repo.delete(row)
