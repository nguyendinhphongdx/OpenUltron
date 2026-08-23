from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.credential.models import Credential


class CredentialRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, *, provider: str, ciphertext: bytes, is_valid: bool) -> Credential:
        row = Credential(provider=provider, ciphertext=ciphertext, is_valid=is_valid)
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_by_provider(self, provider: str) -> Credential | None:
        stmt = select(Credential).where(Credential.provider == provider)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list(self) -> list[Credential]:
        stmt = select(Credential).order_by(Credential.created_at.asc())
        return list((await self.session.execute(stmt)).scalars().all())

    async def delete(self, row: Credential) -> None:
        await self.session.delete(row)
