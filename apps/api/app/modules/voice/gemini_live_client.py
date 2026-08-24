import base64
import json
import ssl
from collections.abc import AsyncIterator

import certifi
import websockets
from sqlalchemy.ext.asyncio import AsyncSession
from websockets.asyncio.client import ClientConnection

from app.core.providers import get_provider_api_key
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

# Dùng CA bundle của certifi thay vì trust store mặc định của OS — máy dev macOS (python.org
# build) không tự có sẵn cert.pem hệ thống, gây SSLCertVerificationError khi kết nối wss://.
# certifi đã là dependency có sẵn (transitive qua httpx/langchain-openai).
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

_ENDPOINT = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)


class GeminiLiveClient:
    """Tự viết WebSocket client cho Gemini Live — KHÔNG dùng SDK `google-genai` (ADR-0009).

    Protocol theo docs/research/live-voice-agent.md (đọc từ https://ai.google.dev/api/live).
    **Đã live-test với GEMINI_API_KEY thật (2026-08-24)** qua text fallback (`send_text` — chưa
    test nhánh audio input `send_audio_chunk`, chưa có client capture audio thật ở `apps/web`):
    connect → setup → setupComplete, transcript + audio delta model trả về đúng, turnComplete
    bắn đúng lúc, transcript flush vào `messages` sạch (không còn rác thinking/signature — xem
    `_map_message`). `goAway.timeLeft` (proto3 Duration string, vd `"3600s"`) và shape
    `realtimeInput.audio` chưa exercise trong lần test này (chỉ text fallback).
    """

    def __init__(
        self, *, model: str, system_instruction: str, tools: list[dict] | None = None
    ) -> None:
        self._model = model
        self._system_instruction = system_instruction
        self._tools = tools or []
        self._ws: ClientConnection | None = None

    async def connect(self, session: AsyncSession) -> None:
        # ADR-0010: tra Credential module (DB, mã hoá) theo provider "gemini" — `session` là 1
        # session DB ngắn hạn mở riêng bởi caller (VoiceService.run(), không phải session sống
        # suốt cả voice session) chỉ để tra key lúc connect.
        api_key = await get_provider_api_key("gemini", session)
        if not api_key:
            raise RuntimeError("Chưa có credential Gemini — thêm qua PUT /credentials/gemini")
        # API key qua header (không phải query string) — tránh lộ key vào access log/URI khi
        # handshake lỗi (finding review: query string dễ bị log lại ở proxy/exception repr).
        ws = await websockets.connect(
            _ENDPOINT,
            additional_headers={"x-goog-api-key": api_key},
            max_size=None,
            ssl=_SSL_CONTEXT,
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

    async def send_history(self, turns: list[dict]) -> None:
        """Nạp lại lịch sử hội thoại cũ (voice cũ + text chat cũ, ADR-0009) vào context TRƯỚC khi
        user bắt đầu nói — `turnComplete: False` để chỉ thêm context, KHÔNG kích model trả lời
        ngay (khác `send_text`, luôn `turnComplete: True`). Không gọi gì nếu rỗng (conversation
        mới, chưa có message nào)."""
        if not turns:
            return
        if self._ws is None:
            raise RuntimeError("Chưa connect()")
        await self._ws.send(json.dumps({"clientContent": {"turns": turns, "turnComplete": False}}))

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
                    # part.thought=True là "thinking trace" nội bộ của model (Gemini 2.5 thinking
                    # model), KHÔNG phải câu trả lời/lời nói thật — xác nhận thật qua live-test
                    # (2026-08-23): model trả "**Crafting a Response**..." lẫn vào modelTurn nếu
                    # không lọc field này. Bỏ qua, không tính là transcript.
                    text = part.get("text")
                    if text and not part.get("thought"):
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
