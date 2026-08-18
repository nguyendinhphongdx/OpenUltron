from fastapi import APIRouter, status

from app.modules.knowledge_base.deps import KnowledgeBaseServiceDep
from app.modules.knowledge_base.schemas import (
    ChunkCreate,
    ChunkRead,
    KnowledgeBaseCreate,
    KnowledgeBaseRead,
    KnowledgeBaseUpdate,
    SearchRequest,
    SearchResult,
)

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


@router.post("", response_model=KnowledgeBaseRead, status_code=status.HTTP_201_CREATED)
async def create_kb(
    body: KnowledgeBaseCreate, service: KnowledgeBaseServiceDep
) -> KnowledgeBaseRead:
    return await service.create(body)


@router.get("", response_model=list[KnowledgeBaseRead])
async def list_kbs(service: KnowledgeBaseServiceDep) -> list[KnowledgeBaseRead]:
    return await service.list()


@router.get("/{kb_id}", response_model=KnowledgeBaseRead)
async def get_kb(kb_id: int, service: KnowledgeBaseServiceDep) -> KnowledgeBaseRead:
    return await service.get(kb_id)


@router.patch("/{kb_id}", response_model=KnowledgeBaseRead)
async def update_kb(
    kb_id: int, body: KnowledgeBaseUpdate, service: KnowledgeBaseServiceDep
) -> KnowledgeBaseRead:
    return await service.update(kb_id, body)


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kb(kb_id: int, service: KnowledgeBaseServiceDep) -> None:
    await service.remove(kb_id)


@router.post("/{kb_id}/chunks", response_model=ChunkRead, status_code=status.HTTP_201_CREATED)
async def add_chunk(kb_id: int, body: ChunkCreate, service: KnowledgeBaseServiceDep) -> ChunkRead:
    return await service.add_chunk(kb_id, body)


@router.post("/{kb_id}/search", response_model=list[SearchResult])
async def search_kb(
    kb_id: int, body: SearchRequest, service: KnowledgeBaseServiceDep
) -> list[SearchResult]:
    return await service.search(kb_id, body.query, body.top_k)
