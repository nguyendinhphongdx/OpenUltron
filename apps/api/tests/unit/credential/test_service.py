from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core import crypto
from app.modules.credential.models import Credential
from app.modules.credential.schemas import CredentialUpsert
from app.modules.credential.service import CredentialService, _mask_key


class FakeRepository:
    """Repository giả, không cần DB — unit test thuần cho business logic (03-testing.md)."""

    def __init__(self) -> None:
        self._rows: dict[str, Credential] = {}

    async def get_by_provider(self, provider: str) -> Credential | None:
        return self._rows.get(provider)

    async def create(self, *, provider: str, ciphertext: bytes, is_valid: bool) -> Credential:
        now = datetime.now(UTC)
        row = Credential(
            id=uuid4(),
            provider=provider,
            ciphertext=ciphertext,
            is_valid=is_valid,
            created_at=now,
            updated_at=now,
        )
        self._rows[provider] = row
        return row

    async def list(self) -> list[Credential]:
        return list(self._rows.values())

    async def delete(self, row: Credential) -> None:
        self._rows.pop(row.provider, None)


def test_mask_key_short_key_fully_masked() -> None:
    assert _mask_key("ab") == "**"


def test_mask_key_long_key_shows_prefix_suffix() -> None:
    assert _mask_key("sk-abcdefgh1234") == "sk-...1234"


@pytest.mark.asyncio
async def test_upsert_new_provider_never_leaks_plaintext(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_verify(self: CredentialService, provider: str, api_key: str) -> bool:
        return True

    monkeypatch.setattr(CredentialService, "_verify", fake_verify)
    service = CredentialService(FakeRepository())

    result = await service.upsert("gemini", CredentialUpsert(api_key="sk-real-secret-value"))

    assert result.is_valid is True
    assert "sk-real-secret-value" not in result.masked_key
    assert result.masked_key == "sk-...alue"


@pytest.mark.asyncio
async def test_upsert_invalid_key_sets_is_valid_false_not_raise(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_verify(self: CredentialService, provider: str, api_key: str) -> bool:
        return False

    monkeypatch.setattr(CredentialService, "_verify", fake_verify)
    service = CredentialService(FakeRepository())

    result = await service.upsert("openai", CredentialUpsert(api_key="sk-wrong"))

    assert result.is_valid is False  # không raise — ADR-0010 "không lưu mù nhưng không chặn lưu"


@pytest.mark.asyncio
async def test_upsert_unsupported_provider_rejected() -> None:
    service = CredentialService(FakeRepository())
    with pytest.raises(HTTPException) as exc_info:
        await service.upsert("ollama", CredentialUpsert(api_key="irrelevant"))
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_upsert_connector_provider_accepted_dispatches_to_connector_registry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """ "github" là connector provider (ADR-0015), không nằm trong `CREDENTIAL_PROVIDERS` (model
    provider, ADR-0012) — `_ensure_supported`/`_verify` phải nhận nó qua registry connector."""
    calls: list[str] = []

    class FakeConnector:
        async def test_connection(self, secret: str) -> bool:
            calls.append(secret)
            return True

    import app.modules.credential.service as service_module

    monkeypatch.setattr(service_module, "get_connector", lambda name: FakeConnector())
    service = CredentialService(FakeRepository())

    result = await service.upsert("github", CredentialUpsert(api_key="ghp_real_token"))

    assert result.is_valid is True
    assert calls == ["ghp_real_token"]


@pytest.mark.asyncio
async def test_upsert_twice_replaces_ciphertext_same_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_verify(self: CredentialService, provider: str, api_key: str) -> bool:
        return True

    monkeypatch.setattr(CredentialService, "_verify", fake_verify)
    repo = FakeRepository()
    service = CredentialService(repo)

    await service.upsert("gemini", CredentialUpsert(api_key="first-key"))
    await service.upsert("gemini", CredentialUpsert(api_key="second-key"))

    assert len(await repo.list()) == 1  # 1 credential/provider (ADR-0010), không tạo row mới
    row = await repo.get_by_provider("gemini")
    assert crypto.decrypt(row.ciphertext) == "second-key"


@pytest.mark.asyncio
async def test_get_decrypted_key_returns_none_when_absent() -> None:
    service = CredentialService(FakeRepository())
    assert await service.get_decrypted_key("gemini") is None


@pytest.mark.asyncio
async def test_remove_missing_provider_404() -> None:
    service = CredentialService(FakeRepository())
    with pytest.raises(HTTPException) as exc_info:
        await service.remove("gemini")
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_test_connection_touches_updated_at_even_if_is_valid_unchanged(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_verify_true(self: CredentialService, provider: str, api_key: str) -> bool:
        return True

    monkeypatch.setattr(CredentialService, "_verify", fake_verify_true)
    repo = FakeRepository()
    service = CredentialService(repo)
    created = await service.upsert("gemini", CredentialUpsert(api_key="sk-real-secret-value"))

    result = await service.test_connection("gemini")

    assert result.is_valid is True
    assert result.updated_at >= created.updated_at
