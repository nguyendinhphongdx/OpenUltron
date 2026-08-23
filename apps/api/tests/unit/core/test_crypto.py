import base64

import pytest
from cryptography.exceptions import InvalidTag

from app.core import crypto


def test_encrypt_decrypt_roundtrip() -> None:
    plaintext = "sk-thisIsAFakeApiKey1234567890"
    ciphertext = crypto.encrypt(plaintext)
    assert crypto.decrypt(ciphertext) == plaintext


def test_encrypt_uses_random_nonce_each_call() -> None:
    # 2 lần encrypt cùng plaintext phải ra ciphertext khác nhau — nonce reuse với AES-GCM là lỗ
    # hổng nghiêm trọng (mất confidentiality), test này bắt regression nếu ai lỡ hardcode nonce.
    plaintext = "same-plaintext"
    assert crypto.encrypt(plaintext) != crypto.encrypt(plaintext)


def test_decrypt_tampered_ciphertext_raises_invalid_tag() -> None:
    ciphertext = bytearray(crypto.encrypt("some-secret"))
    ciphertext[-1] ^= 0xFF  # sửa 1 byte cuối (trong phần tag) — phải bị AESGCM reject
    with pytest.raises(InvalidTag):
        crypto.decrypt(bytes(ciphertext))


def test_load_key_rejects_wrong_length(monkeypatch: pytest.MonkeyPatch) -> None:
    short_key = base64.b64encode(b"too-short").decode()
    monkeypatch.setattr(crypto.settings, "app_encryption_key", short_key)
    with pytest.raises(ValueError, match="32 byte"):
        crypto._load_key()


def test_load_key_rejects_non_base64(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(crypto.settings, "app_encryption_key", "not-valid-base64!!!")
    with pytest.raises(ValueError, match="base64"):
        crypto._load_key()
