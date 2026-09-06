"""SSH connector (ADR-0022) — `test_connection` cho credential module (ADR-0010) + hàm SSH tới 1
host bất kỳ chạy 1 lệnh mà builtin tool `ssh-execute` (`tool/builder.py`) dùng. Module này chỉ biết
SSH protocol shape, không biết gì về `Tool`/`ToolSpec` — tầng tool gọi vào đây, không ngược lại
(cùng pattern `connector/github.py`, ADR-0015).
"""

import asyncssh

from app.core.logging import logger

_CONNECT_TIMEOUT_SECONDS = 15.0


class SshConnectorAdapter:
    async def test_connection(self, secret: str, passphrase: str | None = None) -> bool:
        """Chỉ parse thử private key PEM — KHÔNG connect SSH thật tới host nào (quyết định ADR-0022:
        dialog credential hiện tại không có ô nhập host để test connect thật, và host bất kỳ do
        model tự điền lúc dùng tool nên không có 1 host cố định nào để test lúc lưu credential)."""
        if not secret:
            return False
        try:
            asyncssh.import_private_key(secret, passphrase=passphrase)
            return True
        except (asyncssh.KeyImportError, asyncssh.pbe.KeyEncryptionError) as exc:
            # `KeyEncryptionError` (vd thiếu KDF hỗ trợ, sai passphrase) KHÔNG phải subclass của
            # `KeyImportError` (bug thật phát hiện qua live-test — key có passphrase làm crash
            # request thành 500 thay vì trả `is_valid: false`) — bắt cả 2 riêng, không gộp chung
            # `ValueError` để tránh nuốt nhầm lỗi logic khác không liên quan tới parse key.
            logger.warning("connector.test_connection_invalid_key", connector="ssh", error=str(exc))
            return False


async def execute_command(
    private_key_pem: str,
    host: str,
    port: int,
    username: str,
    command: str,
    *,
    passphrase: str | None = None,
) -> str:
    """Connect thật tới `host` bằng private key đã lưu, chạy `command`, trả
    `"Exit code: {n}\\n{output}"` (cùng format `_execute_sandboxed_command`, ADR-0016).
    `known_hosts=None` (không xác minh host key) là hệ quả bắt buộc của quyết định "không whitelist
    host trước" (ADR-0022) — host do model tự điền, không thể có sẵn known_hosts entry. Rủi ro MITM
    đã ghi rõ ở ADR-0022, không phải lỗ hổng bỏ sót."""
    try:
        client_key = asyncssh.import_private_key(private_key_pem, passphrase=passphrase)
    except (asyncssh.KeyImportError, asyncssh.pbe.KeyEncryptionError) as exc:
        return f"Private key không hợp lệ: {exc}"

    try:
        async with asyncssh.connect(
            host,
            port=port,
            username=username,
            client_keys=[client_key],
            known_hosts=None,
            connect_timeout=_CONNECT_TIMEOUT_SECONDS,
        ) as conn:
            result = await conn.run(command, check=False)
    except (OSError, asyncssh.Error) as exc:
        return f"Không kết nối/thực thi được qua SSH tới {username}@{host}:{port}: {exc}"

    output = f"{result.stdout or ''}{result.stderr or ''}"
    return f"Exit code: {result.exit_status}\n{output}"
