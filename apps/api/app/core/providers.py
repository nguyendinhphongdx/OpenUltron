from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


class ProviderConfigError(RuntimeError):
    """Thiếu config bắt buộc cho provider (vd API key/base_url)."""


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
    if provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(base_url=base_url or settings.ollama_base_url, model=model_id)

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        api_key = await get_provider_api_key("gemini", session)
        if not api_key:
            raise ProviderConfigError(
                "Chưa có credential Gemini — thêm qua PUT /credentials/gemini"
            )
        return ChatGoogleGenerativeAI(model=model_id, google_api_key=api_key)

    if provider == "openai":
        from langchain_openai import ChatOpenAI

        api_key = await get_provider_api_key("openai", session)
        if not api_key:
            raise ProviderConfigError(
                "Chưa có credential OpenAI — thêm qua PUT /credentials/openai"
            )
        return ChatOpenAI(model=model_id, api_key=api_key)

    if provider == "sglang":
        from langchain_openai import ChatOpenAI

        # SGLang serve API tương thích OpenAI (self-host) — không cần API key thật.
        if not base_url:
            raise ProviderConfigError(
                "Provider sglang cần base_url (địa chỉ SGLang server tự host)"
            )
        return ChatOpenAI(model=model_id, api_key="EMPTY", base_url=base_url)

    raise ValueError(f"Unknown provider: {provider}")


async def build_embeddings(
    *, provider: str, model_id: str, base_url: str | None, session: AsyncSession
) -> Embeddings:
    if provider == "ollama":
        from langchain_ollama import OllamaEmbeddings

        return OllamaEmbeddings(base_url=base_url or settings.ollama_base_url, model=model_id)

    if provider == "gemini":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        api_key = await get_provider_api_key("gemini", session)
        if not api_key:
            raise ProviderConfigError(
                "Chưa có credential Gemini — thêm qua PUT /credentials/gemini"
            )
        return GoogleGenerativeAIEmbeddings(model=model_id, google_api_key=api_key)

    if provider == "openai":
        from langchain_openai import OpenAIEmbeddings

        api_key = await get_provider_api_key("openai", session)
        if not api_key:
            raise ProviderConfigError(
                "Chưa có credential OpenAI — thêm qua PUT /credentials/openai"
            )
        return OpenAIEmbeddings(model=model_id, api_key=api_key)

    if provider == "sglang":
        from langchain_openai import OpenAIEmbeddings

        if not base_url:
            raise ProviderConfigError(
                "Provider sglang cần base_url (địa chỉ SGLang server tự host)"
            )
        return OpenAIEmbeddings(model=model_id, api_key="EMPTY", base_url=base_url)

    raise ValueError(f"Unknown embedding provider: {provider}")
