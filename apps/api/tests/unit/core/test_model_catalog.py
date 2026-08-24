from app.core.model_catalog import get_capabilities, list_by_provider


def test_list_by_provider_gemini_only_returns_gemini_entries() -> None:
    entries = list_by_provider("gemini")
    assert len(entries) > 0
    assert all(entry.provider == "gemini" for entry in entries)


def test_list_by_provider_unknown_provider_returns_empty() -> None:
    assert list_by_provider("does-not-exist") == []


def test_list_by_provider_ollama_has_no_hardcoded_entries() -> None:
    # ollama/sglang load riêng (pull local / self-host) — cố ý không hardcode ở catalog này.
    assert list_by_provider("ollama") == []
    assert list_by_provider("sglang") == []


def test_get_capabilities_known_model_returns_capabilities() -> None:
    caps = get_capabilities("gemini", "gemini-2.5-pro")
    assert caps is not None
    assert caps.tools is True


def test_get_capabilities_unknown_model_returns_none() -> None:
    assert get_capabilities("gemini", "does-not-exist") is None


def test_embedding_entries_flagged_is_embedding() -> None:
    embedding_entries = [e for e in list_by_provider("gemini") if e.is_embedding]
    chat_entries = [e for e in list_by_provider("gemini") if not e.is_embedding]
    assert len(embedding_entries) > 0
    assert len(chat_entries) > 0
