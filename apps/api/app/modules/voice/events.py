from dataclasses import dataclass
from typing import Literal

# Internal event type của Ultron — provider adapter (Gemini/OpenAI...) tự map message thật của
# nó sang các type này. Relay/service logic chỉ làm việc với type ở đây, không biết field JSON
# thật của provider nào (ADR-0009, docs/research/live-voice-agent.md).


@dataclass
class AudioDelta:
    """1 chunk audio PCM model sinh ra — nối tiếp nhau tạo audio response đầy đủ."""

    pcm: bytes


@dataclass
class TranscriptDelta:
    """Transcript incremental. role "user" (STT lời người dùng) hoặc "model" (lời agent nói)."""

    role: Literal["user", "model"]
    text: str


@dataclass
class ToolCallRequested:
    """Provider muốn gọi 1 tool — call_id dùng để trả lời khớp lại (send_tool_result)."""

    call_id: str
    name: str
    arguments: dict


@dataclass
class ToolCallCancelled:
    """Provider huỷ 1 tool call đã request trước đó (vd user ngắt lời trước khi tool xong)."""

    call_id: str


@dataclass
class TurnComplete:
    """1 turn (1 lượt nói/nghe) đã xong — chốt transcript đã tích luỹ thành 1 Message."""


@dataclass
class Interrupted:
    """User ngắt lời agent (barge-in) — phải dừng phát audio đang queue ngay."""


@dataclass
class SessionEnding:
    """Provider báo sắp đóng kết nối — cần reconnect/resume trước khi hết time_left.

    time_left là string dạng proto3 Duration (vd "10s") theo Gemini Live, KHÔNG phải số ms —
    giữ raw string, không tự parse/đoán đơn vị khi chưa live-test xác nhận format thật.
    """

    time_left: str | None = None


VoiceEvent = (
    AudioDelta
    | TranscriptDelta
    | ToolCallRequested
    | ToolCallCancelled
    | TurnComplete
    | Interrupted
    | SessionEnding
)
