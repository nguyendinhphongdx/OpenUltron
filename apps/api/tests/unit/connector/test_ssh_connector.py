"""ADR-0022 — `SshConnectorAdapter.test_connection` chỉ parse thử private key PEM (không connect
SSH thật tới host nào, xem `docs/features/ssh-remote-execution-tool.md` "Quyết định thêm"). Dùng
key thật do `asyncssh` tự sinh (không phải chuỗi giả) để test đúng hành vi parse thật."""

import asyncssh
import pytest

from app.modules.connector.ssh import SshConnectorAdapter


def _generate_key_pem(*, passphrase: str | None = None) -> str:
    key = asyncssh.generate_private_key("ssh-ed25519")
    if passphrase:
        return key.export_private_key("pkcs8-pem", passphrase=passphrase).decode()
    return key.export_private_key().decode()


@pytest.mark.asyncio
async def test_test_connection_empty_secret_returns_false() -> None:
    assert await SshConnectorAdapter().test_connection("") is False


@pytest.mark.asyncio
async def test_test_connection_valid_key_no_passphrase_returns_true() -> None:
    pem = _generate_key_pem()
    assert await SshConnectorAdapter().test_connection(pem) is True


@pytest.mark.asyncio
async def test_test_connection_valid_key_with_correct_passphrase_returns_true() -> None:
    pem = _generate_key_pem(passphrase="hunter2")
    assert await SshConnectorAdapter().test_connection(pem, passphrase="hunter2") is True


@pytest.mark.asyncio
async def test_test_connection_valid_key_with_wrong_passphrase_returns_false() -> None:
    pem = _generate_key_pem(passphrase="hunter2")
    assert await SshConnectorAdapter().test_connection(pem, passphrase="wrong") is False


@pytest.mark.asyncio
async def test_test_connection_garbage_string_returns_false() -> None:
    assert await SshConnectorAdapter().test_connection("not a private key at all") is False
