from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.core import crypto
from app.core.logging import logger
from app.core.provider_adapter import CREDENTIAL_PROVIDERS, get_provider
from app.modules.connector.adapter import CREDENTIAL_CONNECTORS, get_connector
from app.modules.credential.models import Credential
from app.modules.credential.repository import CredentialRepository
from app.modules.credential.schemas import CredentialProvider, CredentialRead, CredentialUpsert


def _mask_key(plaintext: str) -> str:
    if len(plaintext) <= 4:
        return "*" * len(plaintext)
    return f"{plaintext[:3]}...{plaintext[-4:]}"


def _to_read(row: Credential) -> CredentialRead:
    return CredentialRead(
        id=row.id,
        provider=row.provider,  # type: ignore[arg-type]
        masked_key=_mask_key(crypto.decrypt(row.ciphertext)),
        is_valid=row.is_valid,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class CredentialService:
    def __init__(self, repo: CredentialRepository) -> None:
        self.repo = repo

    def _ensure_supported(self, provider: str) -> None:
        if provider not in CREDENTIAL_PROVIDERS and provider not in CREDENTIAL_CONNECTORS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Provider '{provider}' không được hỗ trợ credential — chỉ nhận "
                    f"{sorted(CREDENTIAL_PROVIDERS | CREDENTIAL_CONNECTORS)} "
                    "(ollama/sglang self-host, không cần key)"
                ),
            )

    async def _verify(self, provider: str, api_key: str) -> bool:
        """Gọi thật API rẻ nhất để xác nhận key hợp lệ — model provider (`ProviderAdapter`,
        ADR-0012) và connector provider (`ConnectorAdapter`, ADR-0015) là 2 registry độc lập, thử
        registry model trước rồi mới connector; không lặp lại if/elif provider ở đây."""
        if provider in CREDENTIAL_PROVIDERS:
            return await get_provider(provider).test_connection(api_key)
        connector = get_connector(provider)
        return await connector.test_connection(api_key) if connector is not None else False

    async def list(self) -> list[CredentialRead]:
        return [_to_read(r) for r in await self.repo.list()]

    async def _get_or_404(self, provider: str) -> Credential:
        row = await self.repo.get_by_provider(provider)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chưa có credential cho provider '{provider}'",
            )
        return row

    async def upsert(self, provider: CredentialProvider, input: CredentialUpsert) -> CredentialRead:
        self._ensure_supported(provider)
        is_valid = await self._verify(provider, input.api_key)
        ciphertext = crypto.encrypt(input.api_key)
        row = await self.repo.get_by_provider(provider)
        if row is None:
            row = await self.repo.create(
                provider=provider, ciphertext=ciphertext, is_valid=is_valid
            )
        else:
            row.ciphertext = ciphertext
            row.is_valid = is_valid
        logger.info("credential.upserted", provider=provider, is_valid=is_valid)
        return _to_read(row)

    async def remove(self, provider: CredentialProvider) -> None:
        row = await self._get_or_404(provider)
        await self.repo.delete(row)
        logger.info("credential.deleted", provider=provider)

    async def test_connection(self, provider: CredentialProvider) -> CredentialRead:
        row = await self._get_or_404(provider)
        api_key = crypto.decrypt(row.ciphertext)
        row.is_valid = await self._verify(provider, api_key)
        # `updated_at` là proxy "lần test gần nhất" (ADR-0010/spec) — touch thủ công vì
        # `is_valid` có thể không đổi giá trị (SQLAlchemy chỉ tự chạy `onupdate` khi có cột
        # thật sự dirty).
        row.updated_at = datetime.now(UTC)
        logger.info(
            "credential.test_connection_completed", provider=provider, is_valid=row.is_valid
        )
        return _to_read(row)

    async def get_decrypted_key(self, provider: str) -> str | None:
        """Dùng nội bộ bởi `app/core/providers.py` — KHÔNG expose qua router."""
        row = await self.repo.get_by_provider(provider)
        if row is None:
            return None
        return crypto.decrypt(row.ciphertext)
