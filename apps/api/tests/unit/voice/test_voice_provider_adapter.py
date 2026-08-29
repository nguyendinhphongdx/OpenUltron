import pytest

from app.modules.voice.contracts import VoiceAudioFormat
from app.modules.voice.provider_adapter import (
    GeminiLiveVoiceAdapter,
    get_voice_provider,
)


def test_gemini_voice_adapter_builds_gemini_client() -> None:
    adapter = GeminiLiveVoiceAdapter()

    client = adapter.build_client(
        model_id="gemini-live-test",
        system_instruction="system",
        tools=[],
    )

    assert client.__class__.__name__ == "GeminiLiveClient"
    assert adapter.input_audio_format == VoiceAudioFormat(encoding="pcm16", sample_rate_hz=16000)
    assert adapter.output_audio_format == VoiceAudioFormat(encoding="pcm16", sample_rate_hz=24000)


def test_get_voice_provider_rejects_unknown_provider() -> None:
    with pytest.raises(ValueError, match="Unsupported voice provider 'missing'"):
        get_voice_provider("missing")
