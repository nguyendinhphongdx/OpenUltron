# ADR-0009 — Live Voice Agent: provider Gemini Live, transport WebSocket relay

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-23

## Context

Feature "Live Voice Agent" ([docs/features/live-voice-agent.md](../features/live-voice-agent.md),
status draft) muốn Ultron hỗ trợ nói chuyện qua mic full-duplex: VAD tự nhận lượt nói, barge-in, tool
call chạy background trong lúc agent đang nói, transcript lưu vào `Conversation`/`Message` hiện có,
text fallback trong cùng thread. Spec liệt kê 2 quyết định kiến trúc cần ADR trước khi code
`LiveVoiceSessionService`, đã ghi trong roadmap mục "Chưa quyết":

1. Chọn provider realtime voice đầu tiên.
2. Chọn transport giữa browser (`apps/web`) ↔ `apps/api` ↔ provider.

Ultron đã dùng Gemini làm 1 model provider hiện có qua `langchain-google-genai` ([ADR-0007](0007-resource-model-provider-tool-kb.md)).
Docs Gemini Live API mô tả rõ capability: barge-in, tool use, transcription, proactive audio,
affective dialog, live translation, native audio output — và hỗ trợ tiếng Việt tốt, phù hợp nhu cầu
dùng hàng ngày của Ultron (công cụ 1 người dùng, không cần tối ưu cho nhiều ngôn ngữ/nhiều tenant).

## Decision

**Provider đầu tiên: Gemini Live.** Chỉ implement 1 provider trong scope này — `openai_realtime`
(hoặc provider khác) để sau, không dựng song song ngay từ đầu.

**Tự viết WebSocket client, KHÔNG dùng SDK `google-genai`.** Protocol Gemini Live đã đủ rõ để tự
implement (xem [research](../research/live-voice-agent.md), đọc từ
[ai.google.dev/api/live](https://ai.google.dev/api/live)):

- 1 endpoint duy nhất: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`.
- Message JSON gửi lên chỉ 1 trong 4 field: `setup`/`clientContent`/`realtimeInput`/`toolResponse`.
- Message nhận về chỉ 1 trong các field: `setupComplete`/`serverContent`/`toolCall`/
  `toolCallCancellation`/`goAway`/`sessionResumptionUpdate`.

Dùng lib `websockets` (Python, thêm vào `apps/api/pyproject.toml`) tự viết message loop — đúng
tinh thần Ultron tự viết toàn bộ code (AGENTS.md), SDK ở đây không thay được nhiều code thật (khác
LangGraph/SQLAlchemy — những lib đó thay hàng nghìn dòng, đây chỉ là 1 WebSocket + JSON loop).

**Interface provider thiết kế theo khái niệm chung, tham khảo CẢ 2 protocol (Gemini Live + OpenAI
Realtime) để không phải viết lại khi thêm provider thứ hai** — dù chỉ code Gemini Live bây giờ:

- Internal event type của Ultron (không map thẳng tên field của Gemini vào code): `AudioDelta`,
  `TranscriptDelta` (role user/model), `ToolCallRequested`, `TurnComplete`, `Interrupted`,
  `SessionEnding`.
- Provider adapter (Gemini-specific) tự map message thật của nó (`serverContent.interrupted` →
  `Interrupted`, `serverContent.modelTurn` → `AudioDelta`/`TranscriptDelta`, `toolCall.functionCalls`
  → `ToolCallRequested`...) sang các internal event trên — client/relay logic phía `apps/api` chỉ
  làm việc với internal event, không biết chi tiết Gemini hay OpenAI.
- **Lý do phải thiết kế vậy ngay từ đầu (không phải "phòng hờ")**: research đã chỉ ra khác biệt thật
  — Gemini server tự báo `interrupted`, còn OpenAI client phải tự suy ra từ VAD event
  `input_audio_buffer.speech_started` (chưa đọc rõ cơ chế client phải làm gì tiếp — xem "Câu hỏi mở"
  trong research). Nghĩa là logic phát sinh `Interrupted` PHẢI nằm trong provider adapter cụ thể,
  không phải 1 hàm chung đoán được cho mọi provider — đây là ranh giới interface thật cần đúng ngay,
  không phải abstraction thừa.

**Transport: WebSocket, không WebRTC**, theo đúng protocol native của Gemini Live (client library
`google-genai` dùng WebSocket để stream audio 2 chiều, không phải WebRTC):

- Kiến trúc relay 2 chặng, `apps/api` làm cầu nối — **browser không nói thẳng tới Gemini**:

  ```
  apps/web  ──WebSocket (binary PCM frame)──▶  apps/api (module `voice`)
                                                      │
                                                      ▼
                                              WebSocket ──▶ Gemini Live API
  ```

- `apps/api` giữ API key Gemini phía server, forward audio + nhận lại event (audio response,
  transcript delta, tool-call event) — đúng nguyên tắc không lộ secret ra client (ADR-0007, env var
  không trả về client).
- Browser capture mic qua Web Audio API/AudioWorklet, gửi PCM chunk qua WebSocket binary frame; nhận
  lại audio response + event JSON (transcript/tool-call/state) qua cùng kết nối hoặc kênh song song
  cùng WebSocket.
- Không cần ICE/STUN/TURN/NAT traversal — không có nhu cầu P2P thật (chỉ 1 user, chạy local/self-host).

**Ranh giới với agent execution hiện có**: module voice session **không** viết lại orchestrator.
Khi Gemini Live phát tool-call event, `apps/api` forward vào đúng `AgentService`/`chat/graph.py`
logic đã có (LangGraph, [ADR-0005](0005-langgraph-agent-execution.md)) để resolve tool/sub-agent,
rồi trả kết quả ngược lại qua WebSocket cho Gemini tiếp tục sinh audio. Voice session chỉ thêm 1
transport mới cho input/output audio — agent/tool/KB core dùng lại y nguyên.

Transcript (cả lời user và agent) persist vào `Message` của đúng `Conversation` đang mở voice
session — tái dùng domain model hiện có ([docs/domain/](../domain/)), không thêm entity mới trong
scope ADR này.

## Consequences

- ✅ Kiến trúc transport khớp đúng protocol native của provider đã chọn — không cần lớp transcode
  WebRTC → WebSocket, không phải dựng/maintain SFU hay media relay riêng.
- ✅ Đơn giản hơn WebRTC cho use-case 1 người dùng, tự host: không cần signaling server, ICE/STUN/TURN.
- ✅ Agent logic (tool-call, RAG, sub-agent delegation, approval-gate) dùng lại 100% qua
  `chat/graph.py` — không nhân đôi orchestrator cho voice, đúng nguyên tắc tách
  `TextChatService`/`LiveVoiceSessionService` chỉ khác transport (spec, mục Goals).
- ⚠️ WebSocket audio streaming từ browser cần code tay nhiều hơn WebRTC (WebRTC có sẵn negotiation,
  echo-cancellation, jitter buffer qua browser API) — chấp nhận trade-off này vì đổi lại kiến trúc
  đơn giản hơn đáng kể, không cần SFU, khớp đúng protocol Gemini Live.
- ⚠️ Xử lý khi user gõ text giữa voice session (agent trả lời bằng audio hay text) — **chưa quyết**
  trong ADR này, để lại cho lúc code hoặc update spec (xem "Câu hỏi mở" trong
  [docs/features/live-voice-agent.md](../features/live-voice-agent.md)).
- ⚠️ Có lưu file audio hay chỉ transcript — **chưa quyết**. Nếu cần lưu file audio, đó là entity mới
  ngoài `Conversation`/`Message` hiện có → cần quay lại spec/ADR riêng trước khi thêm, không tự ý mở
  rộng domain model trong lúc code voice session.
- ⚠️ Provider thứ hai (OpenAI Realtime, dùng WebRTC hoặc WebSocket tuỳ SDK) chưa xét — nếu thêm sau,
  có thể cần revisit ADR này (transport có thể không dùng chung 1 kiểu relay cho mọi provider).
- ⚠️ **Mất khả năng self-host cho phần voice.** Gemini Live/OpenAI Realtime là model
  speech-to-speech gốc, chỉ có bản hosted (gọi qua API key) — khác với model text/embedding, nơi
  Ultron đã có SGLang tự host ngang hàng ollama/gemini/openai ([ADR-0007](0007-resource-model-provider-tool-kb.md)).
  Chấp nhận đánh đổi này ở giai đoạn hiện tại vì chưa có model mở tương đương chạy full-duplex
  latency thấp + barge-in tự nhiên trên máy cá nhân. Muốn tự host voice sau này phải đi hướng khác
  hẳn — **chained pipeline** (STT tự host, vd Whisper → LLM tự host qua ollama/SGLang, agent logic
  dùng lại y nguyên → TTS tự host, vd Piper/XTTS) — latency cao hơn, phải tự viết VAD/barge-in tay,
  không tận dụng được kiến trúc relay của ADR này. Đây là 1 provider implementation khác hẳn, để
  ADR riêng khi thật cần, không mở rộng ADR này để cover luôn.

- ⚠️ **Tự implement protocol = tự chịu maintenance khi Google đổi protocol** (SDK chính thức sẽ tự
  cập nhật, tự viết thì phải tự theo dõi). Chấp nhận vì protocol hiện tại đơn giản (JSON message
  loop qua 1 WebSocket, không có logic phức tạp SDK mới đáng giá), và khớp nguyên tắc "tự viết toàn
  bộ code" của Ultron — nếu sau này protocol đổi nhiều/phức tạp hơn hẳn, có thể revisit ADR này.

## Alternatives considered

- **Dùng SDK chính thức `google-genai`**: loại — protocol đơn giản (1 endpoint, message JSON có
  shape rõ), tự viết không tốn nhiều hơn đáng kể so với học API của SDK, và giữ được kiểm soát đầy
  đủ để thiết kế internal event type dùng chung cho nhiều provider (SDK sẽ ép theo model/class riêng
  của Google, khó map sang abstraction chung).

- **WebRTC end-to-end (browser ↔ Gemini)**: loại — Gemini Live không nhận kết nối WebRTC trực tiếp,
  cần dựng thêm 1 media relay/SFU để transcode WebRTC (browser) → WebSocket (Gemini phía provider),
  tăng phức tạp không cần thiết cho 1 người dùng, không có lợi ích rõ (không cần P2P thật, không có
  nhiều peer).
- **OpenAI Realtime làm provider đầu tiên**: loại — đã chốt Gemini Live vì hỗ trợ tiếng Việt tốt hơn
  và Ultron đã có sẵn hạ tầng Gemini provider ([ADR-0007](0007-resource-model-provider-tool-kb.md)).
  Có thể revisit khi thêm provider thứ hai.
- **Browser nói thẳng tới Gemini Live (không qua relay `apps/api`)**: loại — cần lộ API key Gemini
  ra client hoặc dùng ephemeral token phức tạp hơn, đi ngược nguyên tắc giữ secret phía server đã áp
  dụng cho các provider khác (ADR-0007).
