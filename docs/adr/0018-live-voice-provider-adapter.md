# ADR-0018 — Live Voice provider adapter

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-29

## Context

ADR-0009 chọn Gemini Live + WebSocket relay làm provider đầu tiên cho Live Voice Agent. Sau khi code
thật, `VoiceService` đã có internal event type chung (`AudioDelta`, `TranscriptDelta`,
`ToolCallRequested`, `Interrupted`, `TurnComplete`, `SessionEnding`) nhưng vẫn gọi trực tiếp
`GeminiLiveClient` và giữ model Gemini hardcode trong service.

User muốn Live Voice sau này dùng được nhiều provider hơn: Gemini, OpenAI Realtime/GPT, hoặc pipeline
self-host. Nếu giữ coupling hiện tại, thêm provider thứ hai sẽ phải sửa service orchestration, config,
credential lookup, event mapping, test setup, và có nguy cơ trộn field protocol provider vào code
relay chung.

Repo đã có ADR-0012 cho text/embedding provider adapter. Voice realtime khác text/embedding: nó là
session sống lâu, full-duplex, có audio format, tool-call streaming, barge-in, và provider event loop.
Vì vậy không mở rộng `ProviderAdapter` hiện có bằng method voice.

## Decision

Thêm abstraction riêng cho voice:

- `VoiceSessionClient`: protocol cho 1 session realtime đã được build theo provider cụ thể.
- `VoiceProviderAdapter`: protocol/factory để build `VoiceSessionClient`, khai báo default model và
  audio format input/output.
- `VOICE_PROVIDERS`: registry tĩnh, giống tinh thần ADR-0012; không dùng DI container, plugin
  discovery, dynamic import.

Gemini Live trở thành implementation đầu tiên: `GeminiLiveVoiceAdapter` build `GeminiLiveClient`.
`VoiceService` chỉ gọi registry/factory và làm việc với `VoiceSessionClient` + internal `VoiceEvent`;
không import trực tiếp provider client cụ thể.

Trong refactor này vẫn giữ Gemini là voice provider mặc định và giữ model Gemini Live hiện tại để
không đổi hành vi runtime. Việc chọn provider/model từ `Model` catalog, agent settings, hoặc user
settings là scope riêng sau khi có provider thứ hai thật.

Provider mới sau này đi theo 1 trong 2 hướng:

- **Native realtime provider** (OpenAI Realtime, Gemini Live): implement client map event protocol
  thật sang `VoiceEvent`.
- **Self-host pipeline provider**: implement session giả lập realtime qua VAD/STT → text agent → TTS.
  Provider này có latency và barge-in semantics khác native speech-to-speech, nhưng vẫn phải expose
  cùng `VoiceSessionClient` để `VoiceService` không đổi.

## Consequences

- ✅ Thêm OpenAI Realtime sau này chủ yếu là thêm `OpenAIRealtimeVoiceClient`,
  `OpenAIRealtimeVoiceAdapter`, registry entry, credential/model config, và tests.
- ✅ `VoiceService` không còn biết chi tiết Gemini JSON/WebSocket protocol.
- ✅ Giữ abstraction tối thiểu, đúng ngưỡng "đau thật" khi chuẩn bị provider thứ hai; không tạo
  framework provider động quá sớm.
- ⚠️ Frontend hiện vẫn giả định browser ↔ API là WebSocket PCM 16k input / PCM 24k output. Nếu chọn
  OpenAI WebRTC trực tiếp cho browser/mobile theo best practice của OpenAI, cần ADR/feature update
  riêng vì transport frontend sẽ khác WebSocket relay hiện tại.
- ⚠️ Provider/model selection vẫn hardcode Gemini mặc định trong scope này để tránh đổi behavior
  lẫn với refactor. Bước sau mới nên đưa voice capability vào model catalog/settings.

## Alternatives considered

- **Nhét voice vào `ProviderAdapter` hiện có**: loại vì text/embedding adapter build object stateless,
  còn voice là realtime session stateful với audio format, event loop, reconnect/barge-in semantics.
- **Giữ `VoiceService` import trực tiếp `GeminiLiveClient`**: loại vì provider thứ hai sẽ buộc sửa
  orchestration chung và test monkeypatch theo provider cụ thể.
- **DI container/plugin discovery**: loại vì repo đang dùng registry tĩnh cho provider cố định; thêm
  dynamic discovery lúc này tạo phức tạp không cần thiết.
