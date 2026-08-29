from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Literal, Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.voice.events import VoiceEvent


@dataclass(frozen=True)
class VoiceAudioFormat:
    encoding: Literal["pcm16"]
    sample_rate_hz: int
    channels: int = 1


@dataclass(frozen=True)
class VoiceHistoryTurn:
    role: Literal["user", "model"]
    text: str


@dataclass(frozen=True)
class VoiceToolDeclaration:
    name: str
    description: str
    parameters: dict


class VoiceSessionClient(Protocol):
    async def connect(self, session: AsyncSession) -> None: ...

    async def send_audio_chunk(self, pcm: bytes) -> None: ...

    async def send_history(self, turns: list[VoiceHistoryTurn]) -> None: ...

    async def send_text(self, text: str) -> None: ...

    async def send_tool_result(self, call_id: str, result: dict) -> None: ...

    async def close(self) -> None: ...

    def events(self) -> AsyncIterator[VoiceEvent]: ...


class VoiceProviderAdapter(Protocol):
    default_model_id: str
    input_audio_format: VoiceAudioFormat
    output_audio_format: VoiceAudioFormat

    def build_client(
        self, *, model_id: str, system_instruction: str, tools: list[VoiceToolDeclaration]
    ) -> VoiceSessionClient: ...
