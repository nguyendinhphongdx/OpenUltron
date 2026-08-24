"""1 interface + 1 registry cho provider (ADR-0012) — thay `if provider == "gemini"` lặp lại ở
nhiều chỗ gọi. Thêm provider mới = viết 1 class implement `ProviderAdapter` + thêm vào `PROVIDERS`,
KHÔNG sửa `core/providers.py`/`credential/service.py`.
"""

from typing import Protocol

import httpx
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from app.core.config import settings
from app.core.logging import logger

_TEST_CONNECTION_TIMEOUT_SECONDS = 5.0


class ProviderConfigError(RuntimeError):
    """Thiếu config bắt buộc cho provider (vd API key/base_url)."""


class ProviderAdapter(Protocol):
    requires_credential: (
        bool  # True: cần API key (gemini/openai) — False: self-host (ollama/sglang)
    )

    def build_chat_model(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> BaseChatModel: ...

    def build_embeddings(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> Embeddings: ...

    async def test_connection(self, api_key: str | None) -> bool: ...


class OllamaAdapter:
    requires_credential = False

    def build_chat_model(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> BaseChatModel:
        from langchain_ollama import ChatOllama

        return ChatOllama(base_url=base_url or settings.ollama_base_url, model=model_id)

    def build_embeddings(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> Embeddings:
        from langchain_ollama import OllamaEmbeddings

        return OllamaEmbeddings(base_url=base_url or settings.ollama_base_url, model=model_id)

    async def test_connection(self, api_key: str | None) -> bool:
        # Self-host, không có key để test — coi như "luôn sẵn sàng" (module `ollama`, ADR-0011,
        # đã có cách riêng kiểm tra Ollama server sống hay không qua /api/tags).
        return True


class SglangAdapter:
    requires_credential = False

    def build_chat_model(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> BaseChatModel:
        from langchain_openai import ChatOpenAI

        if not base_url:
            raise ProviderConfigError(
                "Provider sglang cần base_url (địa chỉ SGLang server tự host)"
            )
        return ChatOpenAI(model=model_id, api_key="EMPTY", base_url=base_url)

    def build_embeddings(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> Embeddings:
        from langchain_openai import OpenAIEmbeddings

        if not base_url:
            raise ProviderConfigError(
                "Provider sglang cần base_url (địa chỉ SGLang server tự host)"
            )
        return OpenAIEmbeddings(model=model_id, api_key="EMPTY", base_url=base_url)

    async def test_connection(self, api_key: str | None) -> bool:
        return True


class GeminiAdapter:
    requires_credential = True

    def build_chat_model(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> BaseChatModel:
        from langchain_google_genai import ChatGoogleGenerativeAI

        if not api_key:
            raise ProviderConfigError(
                "Chưa có credential Gemini — thêm qua PUT /credentials/gemini"
            )
        return ChatGoogleGenerativeAI(model=model_id, google_api_key=api_key)

    def build_embeddings(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> Embeddings:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        if not api_key:
            raise ProviderConfigError(
                "Chưa có credential Gemini — thêm qua PUT /credentials/gemini"
            )
        return GoogleGenerativeAIEmbeddings(model=model_id, google_api_key=api_key)

    async def test_connection(self, api_key: str | None) -> bool:
        if not api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=_TEST_CONNECTION_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    "https://generativelanguage.googleapis.com/v1beta/models",
                    params={"key": api_key},
                )
            return response.status_code == 200
        except httpx.HTTPError as exc:
            logger.warning(
                "provider.test_connection_network_error", provider="gemini", error=str(exc)
            )
            return False


class OpenAIAdapter:
    requires_credential = True

    def build_chat_model(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> BaseChatModel:
        from langchain_openai import ChatOpenAI

        if not api_key:
            raise ProviderConfigError(
                "Chưa có credential OpenAI — thêm qua PUT /credentials/openai"
            )
        return ChatOpenAI(model=model_id, api_key=api_key)

    def build_embeddings(
        self, *, model_id: str, base_url: str | None, api_key: str | None
    ) -> Embeddings:
        from langchain_openai import OpenAIEmbeddings

        if not api_key:
            raise ProviderConfigError(
                "Chưa có credential OpenAI — thêm qua PUT /credentials/openai"
            )
        return OpenAIEmbeddings(model=model_id, api_key=api_key)

    async def test_connection(self, api_key: str | None) -> bool:
        if not api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=_TEST_CONNECTION_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
            return response.status_code == 200
        except httpx.HTTPError as exc:
            logger.warning(
                "provider.test_connection_network_error", provider="openai", error=str(exc)
            )
            return False


PROVIDERS: dict[str, ProviderAdapter] = {
    "ollama": OllamaAdapter(),
    "sglang": SglangAdapter(),
    "gemini": GeminiAdapter(),
    "openai": OpenAIAdapter(),
}


def get_provider(name: str) -> ProviderAdapter:
    if name not in PROVIDERS:
        raise ValueError(f"Unknown provider: {name}")
    return PROVIDERS[name]


CREDENTIAL_PROVIDERS: frozenset[str] = frozenset(
    name for name, adapter in PROVIDERS.items() if adapter.requires_credential
)
