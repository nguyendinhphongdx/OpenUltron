from fastapi import APIRouter, status

from app.core.model_catalog import ModelCatalogEntry, list_by_provider
from app.modules.model.deps import ModelServiceDep
from app.modules.model.schemas import ModelCreate, ModelRead, ModelUpdate, Provider

router = APIRouter(prefix="/models", tags=["models"])


@router.post("", response_model=ModelRead, status_code=status.HTTP_201_CREATED)
async def create_model(body: ModelCreate, service: ModelServiceDep) -> ModelRead:
    return await service.create(body)


@router.get("", response_model=list[ModelRead])
async def list_models(service: ModelServiceDep) -> list[ModelRead]:
    return await service.list()


@router.get("/catalog", response_model=list[ModelCatalogEntry])
async def get_model_catalog(provider: Provider) -> list[ModelCatalogEntry]:
    """Catalog tĩnh model đã biết theo provider (ADR-0010) — route đặt TRƯỚC `/{model_id}` để
    "catalog" không bị FastAPI match nhầm vào path param `model_id: int`."""
    return list_by_provider(provider)


@router.get("/{model_id}", response_model=ModelRead)
async def get_model(model_id: int, service: ModelServiceDep) -> ModelRead:
    return await service.get(model_id)


@router.patch("/{model_id}", response_model=ModelRead)
async def update_model(model_id: int, body: ModelUpdate, service: ModelServiceDep) -> ModelRead:
    return await service.update(model_id, body)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(model_id: int, service: ModelServiceDep) -> None:
    await service.remove(model_id)
