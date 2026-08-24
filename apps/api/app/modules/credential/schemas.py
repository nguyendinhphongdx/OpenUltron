from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

# Model provider cần API key thật (ADR-0010) — ollama/sglang self-host, không có row Credential.
# "github" là connector provider (ADR-0015, không phải model provider) nhưng tái dùng nguyên
# `Credential` table + mã hoá — coi field `provider` là "tên định danh secret" chung.
CredentialProvider = Literal["gemini", "openai", "github"]


class CredentialUpsert(BaseModel):
    api_key: str


class CredentialRead(BaseModel):
    id: UUID
    provider: CredentialProvider
    masked_key: str  # vd "sk-...ab12" — KHÔNG bao giờ trả plaintext/ciphertext
    is_valid: bool
    created_at: datetime
    updated_at: datetime  # proxy "lần test gần nhất" — mọi lần test-connection đều touch field này
