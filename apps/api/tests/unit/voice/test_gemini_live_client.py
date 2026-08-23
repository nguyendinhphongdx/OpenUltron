import base64

from app.modules.voice.events import (
    AudioDelta,
    Interrupted,
    SessionEnding,
    ToolCallCancelled,
    ToolCallRequested,
    TranscriptDelta,
    TurnComplete,
)
from app.modules.voice.gemini_live_client import GeminiLiveClient


def _client() -> GeminiLiveClient:
    return GeminiLiveClient(model="gemini-2.0-flash-live-001", system_instruction="test")


def test_map_message_audio_delta() -> None:
    pcm = b"\x01\x02\x03"
    message = {
        "serverContent": {
            "modelTurn": {"parts": [{"inlineData": {"data": base64.b64encode(pcm).decode()}}]}
        }
    }
    events = _client()._map_message(message)
    assert events == [AudioDelta(pcm=pcm)]


def test_map_message_model_turn_text_part() -> None:
    message = {"serverContent": {"modelTurn": {"parts": [{"text": "xin chào"}]}}}
    events = _client()._map_message(message)
    assert events == [TranscriptDelta(role="model", text="xin chào")]


def test_map_message_model_turn_thought_part_ignored() -> None:
    # Gemini 2.5 thinking model trả part.thought=True cho reasoning trace nội bộ — xác nhận thật
    # qua live-test 2026-08-23, KHÔNG phải câu trả lời, không được tính là transcript.
    message = {
        "serverContent": {
            "modelTurn": {"parts": [{"text": "**Crafting a Response**...", "thought": True}]}
        }
    }
    assert _client()._map_message(message) == []


def test_map_message_transcript_deltas() -> None:
    message = {
        "serverContent": {
            "inputTranscription": {"text": "xin chào"},
            "outputTranscription": {"text": "chào bạn"},
        }
    }
    events = _client()._map_message(message)
    assert TranscriptDelta(role="user", text="xin chào") in events
    assert TranscriptDelta(role="model", text="chào bạn") in events


def test_map_message_interrupted_and_turn_complete() -> None:
    message = {"serverContent": {"interrupted": True, "turnComplete": True}}
    events = _client()._map_message(message)
    assert Interrupted() in events
    assert TurnComplete() in events


def test_map_message_tool_call() -> None:
    message = {
        "toolCall": {
            "functionCalls": [{"id": "call-1", "name": "echo-agent", "args": {"task": "hi"}}]
        }
    }
    events = _client()._map_message(message)
    assert events == [
        ToolCallRequested(call_id="call-1", name="echo-agent", arguments={"task": "hi"})
    ]


def test_map_message_tool_call_cancellation() -> None:
    message = {"toolCallCancellation": {"ids": ["call-1", "call-2"]}}
    events = _client()._map_message(message)
    assert events == [ToolCallCancelled(call_id="call-1"), ToolCallCancelled(call_id="call-2")]


def test_map_message_go_away() -> None:
    # goAway.timeLeft là proto3 Duration string (vd "30s"), KHÔNG phải số ms.
    message = {"goAway": {"timeLeft": "30s"}}
    events = _client()._map_message(message)
    assert events == [SessionEnding(time_left="30s")]


def test_map_message_empty() -> None:
    assert _client()._map_message({}) == []
