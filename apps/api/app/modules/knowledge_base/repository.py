from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.knowledge_base.models import (
    AgentKnowledgeBase,
    KnowledgeBase,
    KnowledgeChunk,
    KnowledgeFile,
    KnowledgeFolder,
)


class KnowledgeBaseRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, **fields: object) -> KnowledgeBase:
        row = KnowledgeBase(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get(self, kb_id: int) -> KnowledgeBase | None:
        return await self.session.get(KnowledgeBase, kb_id)

    async def get_by_slug(self, slug: str) -> KnowledgeBase | None:
        stmt = select(KnowledgeBase).where(KnowledgeBase.slug == slug)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list(self) -> list[KnowledgeBase]:
        stmt = select(KnowledgeBase).order_by(KnowledgeBase.created_at.asc())
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete(self, row: KnowledgeBase) -> None:
        await self.session.delete(row)

    async def create_folder(self, **fields: object) -> KnowledgeFolder:
        row = KnowledgeFolder(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_folder(self, folder_id: int) -> KnowledgeFolder | None:
        return await self.session.get(KnowledgeFolder, folder_id)

    async def get_folder_by_name(
        self, kb_id: int, parent_folder_id: int | None, name: str
    ) -> KnowledgeFolder | None:
        stmt = select(KnowledgeFolder).where(
            KnowledgeFolder.kb_id == kb_id,
            KnowledgeFolder.parent_folder_id == parent_folder_id,
            KnowledgeFolder.name == name,
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list_folders(self, kb_id: int, parent_folder_id: int | None) -> list[KnowledgeFolder]:
        stmt = select(KnowledgeFolder).where(
            KnowledgeFolder.kb_id == kb_id, KnowledgeFolder.parent_folder_id == parent_folder_id
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete_folder(self, row: KnowledgeFolder) -> None:
        await self.session.delete(row)

    async def create_file(self, **fields: object) -> KnowledgeFile:
        row = KnowledgeFile(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_file(self, file_id: int) -> KnowledgeFile | None:
        return await self.session.get(KnowledgeFile, file_id)

    async def list_files(self, kb_id: int, folder_id: int | None) -> list[KnowledgeFile]:
        stmt = select(KnowledgeFile).where(
            KnowledgeFile.kb_id == kb_id, KnowledgeFile.folder_id == folder_id
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete_file(self, row: KnowledgeFile) -> None:
        await self.session.delete(row)

    async def add_chunk(self, **fields: object) -> KnowledgeChunk:
        row = KnowledgeChunk(**fields)
        self.session.add(row)
        await self.session.flush()
        return row

    async def search(
        self, kb_id: int, query_embedding: list[float], top_k: int
    ) -> list[tuple[KnowledgeChunk, float]]:
        distance = KnowledgeChunk.embedding.cosine_distance(query_embedding).label("distance")
        stmt = (
            select(KnowledgeChunk, distance)
            .where(KnowledgeChunk.kb_id == kb_id)
            .order_by(distance.asc())
            .limit(top_k)
        )
        rows = (await self.session.execute(stmt)).all()
        return [(chunk, float(dist)) for chunk, dist in rows]

    async def get_agent_kb(self, agent_id: int, kb_id: int) -> AgentKnowledgeBase | None:
        stmt = select(AgentKnowledgeBase).where(
            AgentKnowledgeBase.agent_id == agent_id, AgentKnowledgeBase.kb_id == kb_id
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def add_agent_kb(self, agent_id: int, kb_id: int) -> AgentKnowledgeBase:
        row = AgentKnowledgeBase(agent_id=agent_id, kb_id=kb_id)
        self.session.add(row)
        await self.session.flush()
        return row

    async def list_kbs_for_agent(self, agent_id: int) -> list[KnowledgeBase]:
        stmt = (
            select(KnowledgeBase)
            .join(AgentKnowledgeBase, AgentKnowledgeBase.kb_id == KnowledgeBase.id)
            .where(AgentKnowledgeBase.agent_id == agent_id)
        )
        return list((await self.session.execute(stmt)).scalars().all())
