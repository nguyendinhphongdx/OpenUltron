import pytest

from app.core.provider_adapter import (
    CREDENTIAL_PROVIDERS,
    PROVIDERS,
    GeminiAdapter,
    OllamaAdapter,
    OpenAIAdapter,
    SglangAdapter,
    get_provider,
)


def test_get_provider_returns_matching_adapter() -> None:
    assert isinstance(get_provider("ollama"), OllamaAdapter)
    assert isinstance(get_provider("sglang"), SglangAdapter)
    assert isinstance(get_provider("gemini"), GeminiAdapter)
    assert isinstance(get_provider("openai"), OpenAIAdapter)


def test_get_provider_unknown_raises_value_error() -> None:
    with pytest.raises(ValueError, match="Unknown provider"):
        get_provider("does-not-exist")


def test_credential_providers_derived_from_requires_credential_flag() -> None:
    assert CREDENTIAL_PROVIDERS == {"gemini", "openai"}
    for name in CREDENTIAL_PROVIDERS:
        assert PROVIDERS[name].requires_credential is True
    for name in set(PROVIDERS) - CREDENTIAL_PROVIDERS:
        assert PROVIDERS[name].requires_credential is False


@pytest.mark.asyncio
async def test_self_host_adapters_test_connection_always_true() -> None:
    assert await OllamaAdapter().test_connection(None) is True
    assert await SglangAdapter().test_connection(None) is True


@pytest.mark.asyncio
async def test_hosted_adapters_test_connection_false_without_api_key() -> None:
    assert await GeminiAdapter().test_connection(None) is False
    assert await OpenAIAdapter().test_connection(None) is False
