import os

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel

from app.core.config import settings


class ProviderConfigError(RuntimeError):
    """Thiếu config bắt buộc cho provider (vd API key) — ADR-0007."""


def build_chat_model(*, provider: str, model_id: str, base_url: str | None) -> BaseChatModel:
    if provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(base_url=base_url or settings.ollama_base_url, model=model_id)

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ProviderConfigError("Thiếu GEMINI_API_KEY trong .env (ADR-0007)")
        return ChatGoogleGenerativeAI(model=model_id, google_api_key=api_key)

    if provider == "openai":
        from langchain_openai import ChatOpenAI

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ProviderConfigError("Thiếu OPENAI_API_KEY trong .env (ADR-0007)")
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


def build_embeddings(*, provider: str, model_id: str, base_url: str | None) -> Embeddings:
    if provider == "ollama":
        from langchain_ollama import OllamaEmbeddings

        return OllamaEmbeddings(base_url=base_url or settings.ollama_base_url, model=model_id)

    if provider == "gemini":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ProviderConfigError("Thiếu GEMINI_API_KEY trong .env (ADR-0007)")
        return GoogleGenerativeAIEmbeddings(model=model_id, google_api_key=api_key)

    if provider == "openai":
        from langchain_openai import OpenAIEmbeddings

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ProviderConfigError("Thiếu OPENAI_API_KEY trong .env (ADR-0007)")
        return OpenAIEmbeddings(model=model_id, api_key=api_key)

    if provider == "sglang":
        from langchain_openai import OpenAIEmbeddings

        if not base_url:
            raise ProviderConfigError(
                "Provider sglang cần base_url (địa chỉ SGLang server tự host)"
            )
        return OpenAIEmbeddings(model=model_id, api_key="EMPTY", base_url=base_url)

    raise ValueError(f"Unknown embedding provider: {provider}")
