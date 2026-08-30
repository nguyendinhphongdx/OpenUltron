from __future__ import annotations

from app.core.errors import (
    ConflictError,
    ModelProviderError,
    ResourceNotFoundError,
    ValidationFailedError,
)
from app.core.providers import build_embeddings
from app.modules.agent.service import AgentService
from app.modules.knowledge_base.models import (
    KnowledgeBase,
    KnowledgeChunk,
    KnowledgeFile,
    KnowledgeFolder,
)
from app.modules.knowledge_base.repository import KnowledgeBaseRepository
from app.modules.knowledge_base.schemas import (
    ChunkCreate,
    ChunkRead,
    FileCreate,
    FileRead,
    FolderCreate,
    FolderRead,
    KnowledgeBaseCreate,
    KnowledgeBaseRead,
    KnowledgeBaseStats,
    KnowledgeBaseUpdate,
    SearchResult,
)
from app.modules.model.service import ModelService


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


def folder_to_read(row: KnowledgeFolder) -> FolderRead:
    return FolderRead(
        id=row.id,
        kb_id=row.kb_id,
        parent_folder_id=row.parent_folder_id,
        name=row.name,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def file_to_read(row: KnowledgeFile) -> FileRead:
    return FileRead(
        id=row.id,
        kb_id=row.kb_id,
        folder_id=row.folder_id,
        name=row.name,
        status=row.status,  # type: ignore[arg-type]
        error_message=row.error_message,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def chunk_to_read(row: KnowledgeChunk) -> ChunkRead:
    return ChunkRead(
        id=row.id,
        kb_id=row.kb_id,
        file_id=row.file_id,
        content=row.content,
        metadata=row.metadata_,
        created_at=row.created_at,
    )


class KnowledgeBaseService:
    def __init__(
        self,
        repo: KnowledgeBaseRepository,
        model_service: ModelService,
        agent_service: AgentService,
    ) -> None:
        self.repo = repo
        self.model_service = model_service
        self.agent_service = agent_service

    async def create(self, input: KnowledgeBaseCreate) -> KnowledgeBaseRead:
        if await self.repo.get_by_slug(input.slug) is not None:
            raise ConflictError(f"KnowledgeBase slug '{input.slug}' đã tồn tại")
        embedding_model = await self.model_service.find(input.embedding_model_id)
        if embedding_model is None:
            raise ValidationFailedError(f"Model {input.embedding_model_id} không tồn tại")
        if not embedding_model.is_embedding:
            raise ValidationFailedError(
                f"Model '{embedding_model.slug}' chưa đánh dấu is_embedding=true"
            )
        row = await self.repo.create(**input.model_dump())
        return kb_to_read(row)

    async def list(self) -> list[KnowledgeBaseRead]:
        return [kb_to_read(r) for r in await self.repo.list()]

    async def get_or_404(self, kb_id: int) -> KnowledgeBase:
        row = await self.repo.get(kb_id)
        if row is None:
            raise ResourceNotFoundError("KnowledgeBase", kb_id)
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

    async def _get_folder_in_kb_or_404(self, kb_id: int, folder_id: int) -> KnowledgeFolder:
        folder = await self.repo.get_folder(folder_id)
        if folder is None or folder.kb_id != kb_id:
            raise ResourceNotFoundError("Folder", f"{folder_id} (kb_id={kb_id})")
        return folder

    async def _get_file_in_kb_or_404(self, kb_id: int, file_id: int) -> KnowledgeFile:
        file = await self.repo.get_file(file_id)
        if file is None or file.kb_id != kb_id:
            raise ResourceNotFoundError("File", f"{file_id} (kb_id={kb_id})")
        return file

    async def create_folder(self, kb_id: int, input: FolderCreate) -> FolderRead:
        await self.get_or_404(kb_id)
        if input.parent_folder_id is not None:
            await self._get_folder_in_kb_or_404(kb_id, input.parent_folder_id)
        if (
            await self.repo.get_folder_by_name(kb_id, input.parent_folder_id, input.name)
            is not None
        ):
            raise ConflictError(f"Folder '{input.name}' đã tồn tại trong thư mục này")
        row = await self.repo.create_folder(
            kb_id=kb_id, parent_folder_id=input.parent_folder_id, name=input.name
        )
        return folder_to_read(row)

    async def get_folder(self, kb_id: int, folder_id: int) -> FolderRead:
        return folder_to_read(await self._get_folder_in_kb_or_404(kb_id, folder_id))

    async def list_folders(
        self, kb_id: int, parent_folder_id: int | None, limit: int, offset: int
    ) -> list[FolderRead]:
        await self.get_or_404(kb_id)
        if parent_folder_id is not None:
            await self._get_folder_in_kb_or_404(kb_id, parent_folder_id)
        rows = await self.repo.list_folders(kb_id, parent_folder_id, limit, offset)
        return [folder_to_read(r) for r in rows]

    async def delete_folder(self, kb_id: int, folder_id: int) -> None:
        folder = await self._get_folder_in_kb_or_404(kb_id, folder_id)
        await self.repo.delete_folder(folder)

    async def create_file(self, kb_id: int, input: FileCreate) -> FileRead:
        await self.get_or_404(kb_id)
        if input.folder_id is not None:
            await self._get_folder_in_kb_or_404(kb_id, input.folder_id)
        row = await self.repo.create_file(
            kb_id=kb_id, folder_id=input.folder_id, name=input.name, status="pending"
        )
        return file_to_read(row)

    async def list_files(
        self, kb_id: int, folder_id: int | None, limit: int, offset: int
    ) -> list[FileRead]:
        await self.get_or_404(kb_id)
        if folder_id is not None:
            await self._get_folder_in_kb_or_404(kb_id, folder_id)
        rows = await self.repo.list_files(kb_id, folder_id, limit, offset)
        return [file_to_read(r) for r in rows]

    async def search_files(self, kb_id: int, query: str) -> list[FileRead]:
        await self.get_or_404(kb_id)
        rows = await self.repo.search_files(kb_id, query, limit=50)
        return [file_to_read(r) for r in rows]

    async def get_file(self, kb_id: int, file_id: int) -> FileRead:
        return file_to_read(await self._get_file_in_kb_or_404(kb_id, file_id))

    async def delete_file(self, kb_id: int, file_id: int) -> None:
        file = await self._get_file_in_kb_or_404(kb_id, file_id)
        await self.repo.delete_file(file)

    async def list_file_chunks(self, kb_id: int, file_id: int) -> list[ChunkRead]:
        await self._get_file_in_kb_or_404(kb_id, file_id)
        return [chunk_to_read(r) for r in await self.repo.list_file_chunks(kb_id, file_id)]

    async def get_stats(self, kb_id: int) -> KnowledgeBaseStats:
        await self.get_or_404(kb_id)
        files_by_status = await self.repo.count_files_by_status(kb_id)
        total_chunks, total_content_chars = await self.repo.chunk_stats(kb_id)
        return KnowledgeBaseStats(
            total_folders=await self.repo.count_folders(kb_id),
            total_files=sum(files_by_status.values()),
            files_by_status=files_by_status,
            total_chunks=total_chunks,
            total_content_chars=total_content_chars,
        )

    async def add_file_chunk(self, kb_id: int, file_id: int, input: ChunkCreate) -> ChunkRead:
        """Chunk 1 file — cập nhật `KnowledgeFile.status` theo vòng đời pending→chunking→done/error.

        Đồng bộ trong 1 request (chưa có job queue riêng) — status vẫn phản ánh đúng kết quả cuối.
        """
        kb = await self.get_or_404(kb_id)
        file = await self._get_file_in_kb_or_404(kb_id, file_id)
        file.status = "chunking"
        file.error_message = None
        try:
            embedding = await self._embed(kb, input.content)
        except Exception as exc:
            file.status = "error"
            file.error_message = str(exc)
            raise ModelProviderError(f"Embed thất bại: {exc}") from exc
        row = await self.repo.add_chunk(
            kb_id=kb_id,
            file_id=file_id,
            content=input.content,
            embedding=embedding,
            metadata_=input.metadata,
        )
        file.status = "done"
        return chunk_to_read(row)

    async def _embed(self, kb: KnowledgeBase, text: str) -> list[float]:
        embedding_model = await self.model_service.find(kb.embedding_model_id)
        assert embedding_model is not None  # validate ở create(), FK còn nguyên vẹn
        embeddings = await build_embeddings(
            provider=embedding_model.provider,
            model_id=embedding_model.model_id,
            base_url=embedding_model.base_url,
            session=self.repo.session,  # tra credential provider (ADR-0010)
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
        await self.agent_service.get_or_404(agent_id)
        await self.get_or_404(kb_id)
        if await self.repo.get_agent_kb(agent_id, kb_id) is not None:
            raise ConflictError(f"Agent {agent_id} đã được gán KnowledgeBase {kb_id}")
        await self.repo.add_agent_kb(agent_id, kb_id)

    async def list_for_agent(self, agent_id: int) -> list[KnowledgeBaseRead]:
        return [kb_to_read(r) for r in await self.repo.list_kbs_for_agent(agent_id)]
