import pytest

from app.modules.model.router import get_model_catalog


@pytest.mark.asyncio
async def test_get_model_catalog_returns_entries_for_provider() -> None:
    entries = await get_model_catalog("gemini")
    assert len(entries) > 0
    assert all(entry.provider == "gemini" for entry in entries)


@pytest.mark.asyncio
async def test_get_model_catalog_ollama_returns_empty() -> None:
    assert await get_model_catalog("ollama") == []
