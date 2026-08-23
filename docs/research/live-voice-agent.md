# Research: Protocol thật của Gemini Live API và OpenAI Realtime API

Liên quan spec: `docs/features/live-voice-agent.md`, [ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md)

## Câu hỏi nghiên cứu

ADR-0009 đã chốt Gemini Live làm provider đầu + relay qua WebSocket. Câu hỏi tiếp: nên dùng SDK
chính thức (`google-genai`) hay **tự viết WebSocket client** implement trực tiếp protocol — và nếu
tự viết, thiết kế interface provider sao cho không phải viết lại toàn bộ khi thêm OpenAI Realtime
sau. Cần đọc đúng protocol thật của cả 2, không đoán.

## Nguồn

- **Gemini Live API** — [ai.google.dev/gemini-api/docs/live-api](https://ai.google.dev/gemini-api/docs/live-api)
  (overview) + [ai.google.dev/api/live](https://ai.google.dev/api/live) (WebSocket reference — có
  endpoint/message type cụ thể).
- **OpenAI Realtime API** — [developers.openai.com/api/docs/guides/realtime](https://developers.openai.com/api/docs/guides/realtime)
  (`platform.openai.com/docs/guides/realtime` redirect sang đây).

## So sánh

| | Gemini Live | OpenAI Realtime |
|---|---|---|
| **Endpoint** | `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent` — 1 endpoint duy nhất | `/v1/realtime` (WebSocket, dùng cho server-to-server) và `/v1/realtime/calls` (WebRTC, dùng cho browser/mobile) — **2 transport khác nhau tuỳ nơi kết nối** |
| **Auth** | API key hoặc ephemeral token (client-to-server) | Ephemeral credential qua `POST /v1/realtime/client_secrets` (server tạo, client dùng token tạm) |
| **Input format** | Audio PCM 16-bit, 16kHz, little-endian; ảnh JPEG ≤1FPS; text | Không thấy field format cụ thể trong overview đã đọc — cần đọc sâu hơn lúc code |
| **Output format** | Audio PCM 16-bit, 24kHz, little-endian | — |
| **Message client → server** | JSON, 1 trong 4 field: `setup` (config phiên), `clientContent` (turns[] + turnComplete), `realtimeInput` (audio/video/text stream + activityStart/End), `toolResponse` (functionResponses[]) | Named events: `session.update`, `input_audio_buffer.append`, `input_audio_buffer.commit`, `response.create` |
| **Message server → client** | `setupComplete`, `serverContent` (modelTurn, generationComplete, turnComplete, **interrupted**, inputTranscription, outputTranscription), `toolCall` (functionCalls[]), `toolCallCancellation`, `goAway` (timeLeft), `sessionResumptionUpdate` | `response.output_audio.delta`, `response.output_audio_transcript.delta`, `response.output_text.delta`, `input_audio_buffer.speech_started`/`speech_stopped`, `response.function_call_arguments.delta` |
| **Barge-in signal** | Server tự phát `serverContent.interrupted` — server đã biết và báo, client chỉ cần dừng playback | Client tự suy ra từ VAD event `input_audio_buffer.speech_started` (không thấy field "interrupted" tường minh trong overview) — nhiều khả năng app phải tự gọi hành động cancel response, cần đọc kỹ hơn lúc code, KHÔNG giả định |
| **Session resumption** | Có (`sessionResumptionUpdate`, `newHandle`/`resumable`) | Không thấy trong overview đã đọc |

## Insight áp dụng cho Ultron

- **Tự viết WebSocket client cho Gemini Live, không dùng SDK `google-genai`** — protocol đã đủ rõ
  (1 endpoint, message shape JSON đơn giản: object có đúng 1 field trong số 4 loại) để tự implement
  bằng lib `websockets` (Python), đúng tinh thần Ultron tự viết toàn bộ code, SDK chỉ tăng
  dependency mà không giảm được bao nhiêu code thật (khác spaCy/langchain — những lib đó thay cho
  hàng nghìn dòng, còn đây chỉ là 1 WebSocket + JSON message loop).
- **Thiết kế internal event type riêng của Ultron**, không map thẳng field tên Gemini vào code — vì
  sau này thêm OpenAI Realtime, 2 protocol đặt tên khác hẳn (`serverContent.interrupted` vs
  `input_audio_buffer.speech_started`). Interface provider nên có sẵn các khái niệm chung: audio
  delta, transcript delta (role user/model), tool-call request, turn-complete, interrupted — provider
  cụ thể (Gemini/OpenAI) chịu trách nhiệm map message thật của nó sang các khái niệm chung này.
- **Điểm khác biệt lớn cần thiết kế đúng ngay từ đầu**: Gemini báo `interrupted` chủ động từ server;
  OpenAI phải tự suy ra từ VAD event — nghĩa là logic "dừng playback khi bị ngắt lời" **không thể**
  đặt hoàn toàn ở phía client chung cho mọi provider — provider adapter (phần Gemini-specific hoặc
  OpenAI-specific) phải tự quyết khi nào phát sinh internal event "Interrupted", không phải client
  logic đoán chung 1 kiểu cho mọi provider.

## Không áp dụng / ngoài phạm vi

- OpenAI's `/v1/realtime/calls` (WebRTC cho browser) — Ultron không dùng vì đã chốt Gemini Live làm
  provider đầu (ADR-0009), và Gemini không có tùy chọn WebRTC nên toàn bộ transport phải là
  WebSocket cho nhất quán — không tự thêm WebRTC cho "phòng khi thêm OpenAI sau", chỉ thêm khi thật
  cần (AGENTS.md rule 2).
- `reasoning.effort` của OpenAI (low/medium/high) — khái niệm riêng của OpenAI Realtime, không có
  tương đương ở Gemini Live, không thiết kế field chung cho việc này.

## Câu hỏi còn mở (không tự trả lời, để lúc code đọc sâu hơn)

- Field format input audio của OpenAI Realtime chưa đọc rõ trong overview này.
- Cơ chế client thật sự phải làm gì khi nhận `speech_started` từ OpenAI (có event `response.cancel`
  không, hay app tự dừng playback + gửi gì) — cần đọc trang reference chi tiết hơn lúc thêm provider
  này, không giả định bây giờ.
