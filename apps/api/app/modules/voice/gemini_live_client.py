import base64
import json
import os
from collections.abc import AsyncIterator

import websockets
from websockets.asyncio.client import ClientConnection

from app.modules.voice.events import (
    AudioDelta,
    Interrupted,
    SessionEnding,
    ToolCallCancelled,
    ToolCallRequested,
    TranscriptDelta,
    TurnComplete,
    VoiceEvent,
)

_ENDPOINT = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)


class GeminiLiveClient:
    """Tự viết WebSocket client cho Gemini Live — KHÔNG dùng SDK `google-genai` (ADR-0009).

    Protocol theo docs/research/live-voice-agent.md (đọc từ https://ai.google.dev/api/live).
    Vài chi tiết tài liệu không nêu tường minh (shape chính xác `realtimeInput.audio` blob,
    `goAway.timeLeft` là proto3 Duration string) giữ nguyên dạng raw/comment rõ — **chưa
    live-test với GEMINI_API_KEY thật** (giống các provider khác trong `core/providers.py`, xem
    roadmap). Chạy thật + sửa lại theo lỗi thật trước khi coi module `voice` là done.
    """

    def __init__(
        self, *, model: str, system_instruction: str, tools: list[dict] | None = None
    ) -> None:
        self._model = model
        self._system_instruction = system_instruction
        self._tools = tools or []
        self._ws: ClientConnection | None = None

    async def connect(self) -> None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("Thiếu GEMINI_API_KEY trong .env (ADR-0007)")
        # API key qua header (không phải query string) — tránh lộ key vào access log/URI khi
        # handshake lỗi (finding review: query string dễ bị log lại ở proxy/exception repr).
        ws = await websockets.connect(
            _ENDPOINT, additional_headers={"x-goog-api-key": api_key}, max_size=None
        )
        try:
            await ws.send(
                json.dumps(
                    {
                        "setup": {
                            "model": f"models/{self._model}",
                            "generationConfig": {"responseModalities": ["AUDIO"]},
                            "systemInstruction": {"parts": [{"text": self._system_instruction}]},
                            "inputAudioTranscription": {},
                            "outputAudioTranscription": {},
                            "tools": self._tools,
                        }
                    }
                )
            )
            raw = await ws.recv()
            message = json.loads(raw)
            if "setupComplete" not in message:
                raise RuntimeError(f"Gemini Live không xác nhận setup: {message}")
        except Exception:
            await ws.close()
            raise
        self._ws = ws

    async def send_audio_chunk(self, pcm: bytes) -> None:
        """PCM 16-bit, 16kHz, little-endian — input format Gemini Live yêu cầu."""
        if self._ws is None:
            raise RuntimeError("Chưa connect()")
        await self._ws.send(
            json.dumps(
                {
                    "realtimeInput": {
                        "audio": {
                            "data": base64.b64encode(pcm).decode("ascii"),
                            "mimeType": "audio/pcm;rate=16000",
                        }
                    }
                }
            )
        )

    async def send_text(self, text: str) -> None:
        """Text fallback trong lúc voice session — clientContent, không phải realtimeInput."""
        if self._ws is None:
            raise RuntimeError("Chưa connect()")
        await self._ws.send(
            json.dumps(
                {
                    "clientContent": {
                        "turns": [{"role": "user", "parts": [{"text": text}]}],
                        "turnComplete": True,
                    }
                }
            )
        )

    async def send_tool_result(self, call_id: str, result: dict) -> None:
        if self._ws is None:
            raise RuntimeError("Chưa connect()")
        await self._ws.send(
            json.dumps(
                {"toolResponse": {"functionResponses": [{"id": call_id, "response": result}]}}
            )
        )

    async def close(self) -> None:
        if self._ws is not None:
            await self._ws.close()
            self._ws = None

    async def events(self) -> AsyncIterator[VoiceEvent]:
        """Đọc message từ Gemini, map sang internal VoiceEvent (ADR-0009) — caller không cần biết
        field JSON thật của Gemini. Bỏ qua `sessionResumptionUpdate` — chưa làm resume."""
        if self._ws is None:
            raise RuntimeError("Chưa connect()")
        async for raw in self._ws:
            message = json.loads(raw)
            for event in self._map_message(message):
                yield event

    def _map_message(self, message: dict) -> list[VoiceEvent]:
        events: list[VoiceEvent] = []

        server_content = message.get("serverContent")
        if server_content is not None:
            if server_content.get("interrupted"):
                events.append(Interrupted())
            model_turn = server_content.get("modelTurn")
            if model_turn is not None:
                for part in model_turn.get("parts", []):
                    inline_data = part.get("inlineData")
                    if inline_data is not None and "data" in inline_data:
                        events.append(AudioDelta(pcm=base64.b64decode(inline_data["data"])))
                    text = part.get("text")
                    if text:
                        events.append(TranscriptDelta(role="model", text=text))
            output_transcription = server_content.get("outputTranscription")
            if output_transcription and output_transcription.get("text"):
                events.append(TranscriptDelta(role="model", text=output_transcription["text"]))
            input_transcription = server_content.get("inputTranscription")
            if input_transcription and input_transcription.get("text"):
                events.append(TranscriptDelta(role="user", text=input_transcription["text"]))
            if server_content.get("turnComplete"):
                events.append(TurnComplete())

        tool_call = message.get("toolCall")
        if tool_call is not None:
            for call in tool_call.get("functionCalls", []):
                events.append(
                    ToolCallRequested(
                        call_id=call["id"], name=call["name"], arguments=call.get("args", {})
                    )
                )

        tool_call_cancellation = message.get("toolCallCancellation")
        if tool_call_cancellation is not None:
            for call_id in tool_call_cancellation.get("ids", []):
                events.append(ToolCallCancelled(call_id=call_id))

        go_away = message.get("goAway")
        if go_away is not None:
            events.append(SessionEnding(time_left=go_away.get("timeLeft")))

        return events
