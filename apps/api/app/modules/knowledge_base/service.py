from __future__ import annotations

from fastapi import HTTPException, status

from app.core.providers import build_embeddings
from app.modules.agent.repository import AgentRepository
from app.modules.knowledge_base.models import KnowledgeBase, KnowledgeChunk
from app.modules.knowledge_base.repository import KnowledgeBaseRepository
from app.modules.knowledge_base.schemas import (
    ChunkCreate,
    ChunkRead,
    KnowledgeBaseCreate,
    KnowledgeBaseRead,
    KnowledgeBaseUpdate,
    SearchResult,
)
from app.modules.model.repository import ModelRepository


def kb_to_read(row: KnowledgeBase) -> KnowledgeBaseRead:
    return KnowledgeBaseRead(
        id=row.id,
        slug=row.slug,
        name=row.name,
        description=row.description,
        embedding_model_id=row.embedding_model_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def chunk_to_read(row: KnowledgeChunk) -> ChunkRead:
    return ChunkRead(
        id=row.id,
        kb_id=row.kb_id,
        content=row.content,
        metadata=row.metadata_,
        created_at=row.created_at,
    )


class KnowledgeBaseService:
    def __init__(
        self,
        repo: KnowledgeBaseRepository,
        model_repo: ModelRepository,
        agent_repo: AgentRepository,
    ) -> None:
        self.repo = repo
        self.model_repo = model_repo
        self.agent_repo = agent_repo

    async def create(self, input: KnowledgeBaseCreate) -> KnowledgeBaseRead:
        if await self.repo.get_by_slug(input.slug) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"KnowledgeBase slug '{input.slug}' đã tồn tại",
            )
        embedding_model = await self.model_repo.get(input.embedding_model_id)
        if embedding_model is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model {input.embedding_model_id} không tồn tại",
            )
        if not embedding_model.is_embedding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Model '{embedding_model.slug}' chưa đánh dấu is_embedding=true",
            )
        row = await self.repo.create(**input.model_dump())
        return kb_to_read(row)

    async def list(self) -> list[KnowledgeBaseRead]:
        return [kb_to_read(r) for r in await self.repo.list()]

    async def get_or_404(self, kb_id: int) -> KnowledgeBase:
        row = await self.repo.get(kb_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"KnowledgeBase {kb_id} không tồn tại"
            )
        return row

    async def get(self, kb_id: int) -> KnowledgeBaseRead:
        return kb_to_read(await self.get_or_404(kb_id))

    async def update(self, kb_id: int, input: KnowledgeBaseUpdate) -> KnowledgeBaseRead:
        row = await self.get_or_404(kb_id)
        for field, value in input.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        return kb_to_read(row)

    async def remove(self, kb_id: int) -> None:
        row = await self.get_or_404(kb_id)
        await self.repo.delete(row)

    async def _embed(self, kb: KnowledgeBase, text: str) -> list[float]:
        embedding_model = await self.model_repo.get(kb.embedding_model_id)
        assert embedding_model is not None  # validate ở create(), FK còn nguyên vẹn
        embeddings = build_embeddings(
            provider=embedding_model.provider,
            model_id=embedding_model.model_id,
            base_url=embedding_model.base_url,
        )
        return await embeddings.aembed_query(text)

    async def add_chunk(self, kb_id: int, input: ChunkCreate) -> ChunkRead:
        kb = await self.get_or_404(kb_id)
        embedding = await self._embed(kb, input.content)
        row = await self.repo.add_chunk(
            kb_id=kb_id, content=input.content, embedding=embedding, metadata_=input.metadata
        )
        return chunk_to_read(row)

    async def search(self, kb_id: int, query: str, top_k: int) -> list[SearchResult]:
        kb = await self.get_or_404(kb_id)
        query_embedding = await self._embed(kb, query)
        results = await self.repo.search(kb_id, query_embedding, top_k)
        return [SearchResult(chunk=chunk_to_read(c), score=score) for c, score in results]

    async def assign_to_agent(self, agent_id: int, kb_id: int) -> None:
        if await self.agent_repo.get(agent_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Agent {agent_id} không tồn tại"
            )
        await self.get_or_404(kb_id)
        await self.repo.add_agent_kb(agent_id, kb_id)

    async def list_for_agent(self, agent_id: int) -> list[KnowledgeBaseRead]:
        return [kb_to_read(r) for r in await self.repo.list_kbs_for_agent(agent_id)]
