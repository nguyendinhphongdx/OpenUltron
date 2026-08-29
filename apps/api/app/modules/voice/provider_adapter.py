from app.modules.voice.contracts import (
    VoiceAudioFormat,
    VoiceProviderAdapter,
    VoiceSessionClient,
    VoiceToolDeclaration,
)
from app.modules.voice.gemini_live_client import GeminiLiveClient

# Xác nhận thật qua GET /v1beta/models (ListModels) với GEMINI_API_KEY thật — model này là 1
# trong số ít model hỗ trợ bidiGenerateContent tại thời điểm live-test (2026-08-23). Google có
# thể đổi/rotate model Live theo thời gian — nếu lỗi "model not found for bidiGenerateContent",
# gọi lại ListModels để lấy tên hiện hành thay vì đoán.
_GEMINI_LIVE_DEFAULT_MODEL = "gemini-2.5-flash-native-audio-latest"


class GeminiLiveVoiceAdapter:
    default_model_id = _GEMINI_LIVE_DEFAULT_MODEL
    input_audio_format = VoiceAudioFormat(encoding="pcm16", sample_rate_hz=16000)
    output_audio_format = VoiceAudioFormat(encoding="pcm16", sample_rate_hz=24000)

    def build_client(
        self, *, model_id: str, system_instruction: str, tools: list[VoiceToolDeclaration]
    ) -> VoiceSessionClient:
        return GeminiLiveClient(
            model=model_id,
            system_instruction=system_instruction,
            tools=tools,
        )


VOICE_PROVIDERS: dict[str, VoiceProviderAdapter] = {
    "gemini": GeminiLiveVoiceAdapter(),
}


def get_voice_provider(name: str) -> VoiceProviderAdapter:
    try:
        return VOICE_PROVIDERS[name]
    except KeyError as exc:
        supported = ", ".join(sorted(VOICE_PROVIDERS))
        raise ValueError(f"Unsupported voice provider '{name}'. Supported: {supported}") from exc
