from __future__ import annotations

from datetime import UTC, datetime

import httpx
from fastapi import HTTPException, status

from app.core import crypto
from app.core.logging import logger
from app.modules.credential.models import Credential
from app.modules.credential.repository import CredentialRepository
from app.modules.credential.schemas import CredentialProvider, CredentialRead, CredentialUpsert

_SUPPORTED_PROVIDERS: set[str] = {"gemini", "openai"}
_TEST_CONNECTION_TIMEOUT_SECONDS = 5.0


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
        if provider not in _SUPPORTED_PROVIDERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Provider '{provider}' không được hỗ trợ credential — chỉ nhận "
                    f"{sorted(_SUPPORTED_PROVIDERS)} (ollama/sglang self-host, không cần key)"
                ),
            )

    async def _verify(self, provider: str, api_key: str) -> bool:
        """Gọi thật API rẻ nhất của provider để xác nhận key hợp lệ — không raise nếu network
        lỗi/timeout, chỉ trả False (ADR-0010: không lưu mù, nhưng cũng không chặn lưu vì lỗi
        network tạm thời)."""
        try:
            async with httpx.AsyncClient(timeout=_TEST_CONNECTION_TIMEOUT_SECONDS) as client:
                if provider == "gemini":
                    response = await client.get(
                        "https://generativelanguage.googleapis.com/v1beta/models",
                        params={"key": api_key},
                    )
                else:  # openai
                    response = await client.get(
                        "https://api.openai.com/v1/models",
                        headers={"Authorization": f"Bearer {api_key}"},
                    )
            return response.status_code == 200
        except httpx.HTTPError as exc:
            logger.warning(
                "credential.test_connection_network_error", provider=provider, error=str(exc)
            )
            return False

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
