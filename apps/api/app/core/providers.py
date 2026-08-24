"""Chỉ còn 2 việc: tra credential (DB, ADR-0010) và dispatch qua `ProviderAdapter` (ADR-0012).
KHÔNG còn if/elif theo provider ở đây — chi tiết từng provider nằm trong
`app/core/provider_adapter.py`, thêm provider mới sửa file đó, không sửa file này."""

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.provider_adapter import ProviderConfigError, get_provider

__all__ = ["ProviderConfigError", "build_chat_model", "build_embeddings", "get_provider_api_key"]


async def get_provider_api_key(provider: str, session: AsyncSession) -> str | None:
    """Tra Credential module (DB, mã hoá — ADR-0010) theo provider. Import trong hàm (không ở
    module level) để tránh vòng import (module `credential` không cần biết `core/providers.py`,
    nhưng ngược lại thì có — giữ core nhẹ lúc import bình thường)."""
    from app.modules.credential.repository import CredentialRepository
    from app.modules.credential.service import CredentialService

    return await CredentialService(CredentialRepository(session)).get_decrypted_key(provider)


async def build_chat_model(
    *, provider: str, model_id: str, base_url: str | None, session: AsyncSession
) -> BaseChatModel:
    adapter = get_provider(provider)
    api_key = await get_provider_api_key(provider, session) if adapter.requires_credential else None
    return adapter.build_chat_model(model_id=model_id, base_url=base_url, api_key=api_key)


async def build_embeddings(
    *, provider: str, model_id: str, base_url: str | None, session: AsyncSession
) -> Embeddings:
    adapter = get_provider(provider)
    api_key = await get_provider_api_key(provider, session) if adapter.requires_credential else None
    return adapter.build_embeddings(model_id=model_id, base_url=base_url, api_key=api_key)
