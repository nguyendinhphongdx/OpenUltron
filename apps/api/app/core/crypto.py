"""AES-256-GCM encrypt/decrypt cho `Credential.ciphertext` (ADR-0010).

Format bytes trả về từ `encrypt()`: `nonce (12 byte) || AESGCM output (ciphertext + 16-byte tag)`.
`decrypt()` tách lại 12 byte đầu làm nonce, phần còn lại đưa vào `AESGCM.decrypt()`.

Key: `settings.app_encryption_key` (base64 string trong `.env`) phải decode ra đúng 32 byte
(AES-256) — validate ngay lúc import module này (fail-fast lúc app khởi động, vì
`app/main.py` → router → service → module này được import khi app boot, không đợi tới lần
encrypt/decrypt đầu tiên mới phát hiện key sai).
"""

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_NONCE_SIZE = 12
_KEY_SIZE = 32


def _load_key() -> bytes:
    try:
        key = base64.b64decode(settings.app_encryption_key, validate=True)
    except Exception as exc:
        raise ValueError(
            "APP_ENCRYPTION_KEY không phải base64 hợp lệ (ADR-0010) — kiểm tra lại .env"
        ) from exc
    if len(key) != _KEY_SIZE:
        raise ValueError(
            f"APP_ENCRYPTION_KEY phải decode ra đúng {_KEY_SIZE} byte (AES-256), "
            f"nhận {len(key)} byte — kiểm tra lại .env"
        )
    return key


_KEY = _load_key()


def encrypt(plaintext: str) -> bytes:
    """Mã hoá 1 chuỗi plaintext (vd API key) — nonce random mỗi lần gọi."""
    nonce = os.urandom(_NONCE_SIZE)
    ciphertext = AESGCM(_KEY).encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ciphertext


def decrypt(ciphertext: bytes) -> str:
    """Đảo ngược `encrypt()` — raise `cryptography.exceptions.InvalidTag` nếu ciphertext bị sửa
    hoặc mã hoá bằng key khác."""
    nonce, body = ciphertext[:_NONCE_SIZE], ciphertext[_NONCE_SIZE:]
    plaintext = AESGCM(_KEY).decrypt(nonce, body, None)
    return plaintext.decode("utf-8")
