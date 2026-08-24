import asyncio
from dataclasses import dataclass

import pytest
from fastapi import status as ws_status

import app.modules.voice.service as voice_service_module
from app.modules.chat.graph import ModelConfig
from app.modules.chat.service import ChatContext
from app.modules.voice.events import Interrupted, TranscriptDelta, TurnComplete
from app.modules.voice.service import VoiceService


@dataclass
class FakeMessage:
    """Chỉ cần đủ field `_to_gemini_turn` đọc (role/content) — không phải ORM `Message` thật
    (03-testing.md — unit test thuần, không cần DB)."""

    role: str
    content: str


class FakeMessageService:
    def __init__(self, rows: list | None = None) -> None:
        self._rows = rows or []

    async def list_all(self, conversation_id: int) -> list:
        return self._rows


class FakeChatService:
    """`resolve_context` trả 4-tuple thật (system_prompt, model, sub_agent_specs, tool_specs) —
    regression test cho bug thật: `VoiceService.run` từng unpack chỉ 3 giá trị (thiếu
    `tool_specs`, thêm vào `resolve_context` sau khi voice module đã viết xong), khiến MỌI voice
    session bị reject ngay từ đầu (`ValueError: too many values to unpack`), hiện ra phía browser
    là "Mất kết nối voice session." không rõ lý do."""

    def __init__(self, history_rows: list | None = None) -> None:
        self.message_service = FakeMessageService(history_rows)

    async def resolve_context(self, conversation_id: int) -> ChatContext:
        return ChatContext(
            system_prompt="system prompt",
            model=ModelConfig(provider="gemini", model_id="test-model"),
            sub_agents=[],
            tools=[],
            knowledge_bases=[],
        )


class FakeWebSocket:
    def __init__(self) -> None:
        self.closed_with_code: int | None = None
        self.accepted = False
        self.sent_json: list[dict] = []

    async def accept(self) -> None:
        self.accepted = True

    async def close(self, code: int) -> None:
        self.closed_with_code = code

    async def send_json(self, payload: dict) -> None:
        self.sent_json.append(payload)

    async def send_bytes(self, data: bytes) -> None:
        pass

    async def receive(self) -> dict:
        # Không có audio/text nào gửi lên trong test này — chặn vô hạn tới khi bị cancel() lúc
        # `forward_gemini_to_browser` xong (đúng behaviour thật: chiều browser→Gemini chỉ dừng khi
        # browser disconnect).
        await asyncio.Event().wait()
        raise AssertionError("unreachable")


@pytest.mark.asyncio
async def test_run_reaches_gemini_connect_after_resolving_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """`resolve_context()` từng trả tuple trần — bug thật (unpack sai số lượng) khiến `run()`
    luôn reject trước `accept()`. Đã đổi sang `ChatContext` (dataclass, ADR ghi ở
    `docs/features/knowledge-base-chat-wiring.md`) nên lớp bug đó không còn khả năng xảy ra; giữ
    test này như smoke test happy-path: `accept()` phải được gọi rồi mới tới bước connect Gemini
    (mock để raise ngay, giữ test hermetic — không gọi Gemini/DB thật)."""

    class RaisingGeminiLiveClient:
        def __init__(self, **kwargs: object) -> None:
            pass

        async def connect(self, session: object) -> None:
            raise RuntimeError("mocked — không gọi Gemini thật trong unit test")

    monkeypatch.setattr(voice_service_module, "GeminiLiveClient", RaisingGeminiLiveClient)

    service = VoiceService(chat_service=FakeChatService())  # type: ignore[arg-type]
    ws = FakeWebSocket()

    await service.run(ws, conversation_id=1)  # type: ignore[arg-type]

    assert ws.accepted is True
    assert ws.closed_with_code == ws_status.WS_1011_INTERNAL_ERROR


@pytest.mark.asyncio
async def test_barge_in_does_not_split_user_turn_without_a_model_reply(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Bug thật (feedback user 2026-08-24): ngắt lời AI giữa câu (barge-in) rồi nói tiếp bị lưu
    thành 2 `Message` user tách rời, dù trong cùng 1 session Gemini Live model không hề mất
    context — do code cũ chốt (flush) transcript ngay khi có `TurnComplete`, kể cả khi
    `TurnComplete` đi cùng `interrupted` (chưa có phản hồi thật). Sau fix: chỉ chốt khi model đã
    thật sự trả lời — 2 đoạn user nói trước/sau khi ngắt lời AI phải gộp thành 1 `Message`."""

    class FakeGeminiLiveClient:
        def __init__(self, **kwargs: object) -> None:
            pass

        async def connect(self, session: object) -> None:
            pass

        async def send_history(self, turns: list[dict]) -> None:
            pass

        async def close(self) -> None:
            pass

        async def events(self):
            # User nói "Cloud." → AI bắt đầu trả lời → user ngắt lời giữa câu (interrupted +
            # turnComplete cùng lúc, đúng behaviour Gemini Live thật) → user nói tiếp "tiếp tục"
            # → lần này AI trả lời thật → turnComplete thật.
            yield TranscriptDelta(role="user", text="Cloud.")
            yield Interrupted()
            yield TurnComplete()
            yield TranscriptDelta(role="user", text=" tiếp tục")
            yield TranscriptDelta(role="model", text="Đã hiểu.")
            yield TurnComplete()

    monkeypatch.setattr(voice_service_module, "GeminiLiveClient", FakeGeminiLiveClient)

    flush_calls: list[dict] = []

    async def fake_flush(self: VoiceService, conversation_id: int, buffer: dict) -> None:
        if buffer["user"] or buffer["model"]:
            flush_calls.append({"user": list(buffer["user"]), "model": list(buffer["model"])})
        buffer["user"].clear()
        buffer["model"].clear()

    monkeypatch.setattr(VoiceService, "_flush_transcript", fake_flush)

    service = VoiceService(chat_service=FakeChatService())  # type: ignore[arg-type]
    ws = FakeWebSocket()

    await service.run(ws, conversation_id=1)  # type: ignore[arg-type]

    assert flush_calls == [{"user": ["Cloud.", " tiếp tục"], "model": ["Đã hiểu."]}]


@pytest.mark.asyncio
async def test_run_replays_prior_messages_as_history_before_listening(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Gap thật (feedback user 2026-08-24): mỗi lần bấm "Bắt đầu voice" là 1 session Gemini Live
    mới, không tự nhớ hội thoại cũ (khác bug "ngắt lời AI giữa câu" — đó là trong CÙNG 1 session).
    Sau fix: `run()` phải nạp lại `message_service.list_all()` thành turns qua `send_history`
    TRƯỚC khi vào trạng thái nghe — chỉ user/assistant, bỏ system/tool (giống `_to_langchain`)."""
    history_rows = [
        FakeMessage(role="system", content="ignored"),
        FakeMessage(role="user", content="Câu hỏi cũ"),
        FakeMessage(role="assistant", content="Trả lời cũ"),
        FakeMessage(role="tool", content="ignored"),
    ]
    sent_history: list[list[dict]] = []

    class RecordingGeminiLiveClient:
        def __init__(self, **kwargs: object) -> None:
            pass

        async def connect(self, session: object) -> None:
            pass

        async def send_history(self, turns: list[dict]) -> None:
            sent_history.append(turns)

        async def close(self) -> None:
            pass

        async def events(self):
            return
            yield  # pragma: no cover — async generator rỗng, không có event nào

    monkeypatch.setattr(voice_service_module, "GeminiLiveClient", RecordingGeminiLiveClient)

    service = VoiceService(chat_service=FakeChatService(history_rows))  # type: ignore[arg-type]
    ws = FakeWebSocket()

    await service.run(ws, conversation_id=1)  # type: ignore[arg-type]

    assert sent_history == [
        [
            {"role": "user", "parts": [{"text": "Câu hỏi cũ"}]},
            {"role": "model", "parts": [{"text": "Trả lời cũ"}]},
        ]
    ]
