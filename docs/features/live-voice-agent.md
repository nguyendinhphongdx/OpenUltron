# Feature: Live Voice Agent

Status: accepted (2 câu hỏi mở còn lại — text mid-session response modality, approval gate — không
block việc code `apps/web` client, xem "Câu hỏi mở")

## Vấn đề / động lực

Ultron hiện chỉ là 1 text chat app: user gõ message, agent trả lời, có thể trong tương lai thêm SSE
streaming cho text — nhưng vẫn là mô hình turn-based "gõ Enter → chờ trả lời". Các đối thủ gần nhất
(Gemini Live, ChatGPT Voice/GPT-Live, OpenAI Realtime voice agents) đã chuyển sang mô hình
**full-duplex**: agent nghe liên tục qua mic, tự phát hiện lượt nói (VAD), user có thể ngắt lời
(barge-in), agent vừa nói vừa chạy tool/RAG ở background, và transcript + audio đi song song trong
cùng 1 thread.

Ultron là công cụ cá nhân dùng hàng ngày — nói chuyện bằng giọng nói tự nhiên hơn hẳn gõ chữ, đặc
biệt khi đang làm việc khác (di chuyển, nấu ăn, rảnh tay). Thiếu chế độ này khiến Ultron chỉ là
"ChatGPT-like text app" thay vì "trợ lý đang nghe và phản hồi thời gian thực" như tầm nhìn ban đầu.

## Mục tiêu (Goals)

- Nói chuyện với 1 agent bằng mic, không cần bấm gửi mỗi lượt — agent tự nhận biết khi user nói xong
  (VAD, không cần push-to-talk).
- User ngắt lời được agent khi nó đang nói (barge-in) — agent dừng phát audio giữa câu.
- Trong lúc agent "đang nói", nó vẫn chạy được tool call / RAG lookup / gọi sub-agent ở background
  (dùng lại đúng agent capability hiện có — tool/KB/orchestrator — chỉ khác transport).
- Có transcript realtime hiển thị song song với audio (giống Gemini Live/ChatGPT Voice).
- Có state hiển thị được cho UI: `listening / thinking / speaking / using_tool`.
- Voice session ghi lại được vào `Conversation`/`Message` hiện có — không tạo domain model song song;
  tool call trong lúc voice cũng hiện ra như trace phụ giống trong chat text.
- Hỗ trợ fallback qua text ngay trong cùng thread (user gõ chữ giữa lúc đang voice session) — giống
  Gemini Live.
- Kiến trúc tách rõ `TextChatService` (đã có, qua `chat/graph.py`) và `LiveVoiceSessionService` mới —
  cả hai dùng chung agent/tool/KB core, không nhân đôi logic orchestrator.

## Ngoài phạm vi (Non-goals)

- Chưa chọn provider/transport cụ thể trong spec này — đó là quyết định kiến trúc, ra ADR riêng
  (xem mục "Thiết kế" và "Câu hỏi mở"). Spec này chỉ mô tả behavior/UX và ranh giới domain.
- Chưa làm affective dialog / proactive audio (agent tự chủ động nói trước khi user hỏi) — để giai
  đoạn sau.
- Chưa làm voice trên `apps/mobile`/`apps/desktop` (chưa scaffold) — giai đoạn đầu chỉ `apps/web`.
- Chưa làm multi-user / multi-tenant voice room — Ultron vẫn là công cụ 1 người dùng (AGENTS.md rule 6).
- Chưa quyết provider thứ hai (OpenAI Realtime) trong scope code — chỉ thiết kế abstraction đủ chỗ
  để thêm sau, không implement song song 2 provider ngay từ đầu.
- Không thay đổi domain model `Conversation`/`Message`/`ToolCall` hiện có (`docs/domain/`) — voice
  session tái dùng nguyên, không thêm entity mới trong scope spec này (nếu khi thiết kế chi tiết phát
  hiện cần entity mới — ví dụ lưu audio segment — phải quay lại đây trước, không tự thêm).

## Thiết kế

### Behavior / UX

- User bấm "bắt đầu voice session" trong 1 conversation (thread) đã có sẵn — không phải 1 loại
  conversation riêng.
- Trạng thái hiển thị theo state machine: `listening → thinking → speaking`, có thể có `using_tool`
  chồng lên `thinking`/`speaking`.
- Barge-in: nếu user nói trong lúc agent đang ở `speaking`, client dừng playback audio hiện tại, agent
  chuyển ngay về `listening`.
- Transcript (cả lời user và agent) append vào `Message` list của conversation đó theo thời gian thực,
  y như agent đang stream text — audio là lớp phụ, không phải nguồn sự thật duy nhất.
- User gõ text giữa lúc voice session đang mở → xử lý như 1 message thường, agent có thể trả lời bằng
  audio hoặc text tuỳ trạng thái session (chi tiết cần làm rõ ở "Câu hỏi mở").

### Kiến trúc mức cao (cần ADR trước khi code, không quyết ở đây)

- `apps/web`: client dùng **WebSocket** (đã chốt [ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md)
  — không WebRTC, khớp protocol native Gemini Live) để stream mic audio (PCM qua Web Audio
  API/AudioWorklet), nhận lại audio + event (transcript delta, tool-call event, state change).
- `apps/api`: module **`voice`** (đã chốt tên — ADR-0009), tự viết WebSocket client theo protocol
  thật của Gemini Live (không dùng SDK `google-genai`, xem [research](../research/live-voice-agent.md)),
  chịu trách nhiệm:
  - Tạo/quản lý realtime session với provider (token/session bootstrap).
  - Cầu nối event provider ↔ agent core (tool call, RAG, sub-agent delegation) — dùng lại
    `AgentService`/`chat/graph.py` logic, không viết lại orchestrator riêng cho voice.
  - Persist transcript vào `Message` (giống chat text), tool call vào `tool_calls` (đã có gap tương tự
    ở chat text — xem roadmap "Ghi lại tool-call của orchestrator").
- Provider abstraction tối thiểu 2 implementation dự kiến: `gemini_live` (ưu tiên giai đoạn đầu — lý do
  hỗ trợ tiếng Việt tốt + Ultron đã có Gemini là 1 model provider hiện có) và `openai_realtime` (thêm
  sau). Interface chung do ADR quyết, không tự ý thiết kế trong spec này.

## Câu hỏi mở

- ~~Transport: WebRTC hay WebSocket~~ → **đã chốt WebSocket** ([ADR-0009](../adr/0009-live-voice-gemini-live-websocket-relay.md)).
- ~~Provider đầu tiên~~ → **đã chốt Gemini Live** (ADR-0009).
- Khi user gõ text giữa voice session: agent trả lời bằng audio hay text? — code hiện tại forward
  text frame vào `GeminiLiveClient.send_text` (Gemini tự quyết trả lời gì), **chưa live-test** để
  biết Gemini thực tế trả lời audio hay text cho trường hợp này.
- ~~Audio có cần lưu lại (file) hay chỉ lưu transcript?~~ → **đã chốt: chỉ lưu transcript** (quyết
  định 2026-08-24) — không thêm entity/storage mới, giữ đúng non-goal "không đổi domain model".
- Tool call trong lúc voice có cần approval gate giống ADR-0005 (tool chạy lệnh trên máy) không? —
  **vẫn mở**, code hiện tại chỉ forward tool-call cho sub-agent delegation (không có side-effect
  nguy hiểm), chưa đụng tool chạy lệnh máy nên chưa cần gate ngay, nhưng phải quyết trước khi thêm
  loại tool đó vào voice.
- ~~UI state `listening/thinking/speaking/using_tool`~~ → **đã chốt: thêm event `state` ở
  `apps/api`** (quyết định 2026-08-24, xem `voice/service.py::set_state`) — server suy state từ
  event Gemini đã có (không có state tường minh từ provider) và bắn `{"type": "state", "value":
  ...}` mỗi lần đổi thật. Giới hạn đã biết: input audio là stream liên tục do server-side VAD của
  Gemini tự quyết, không có mốc rõ "user vừa nói xong" phía client nên nhánh audio bỏ qua
  `thinking` (chuyển thẳng `listening → speaking` khi có output đầu tiên) — chỉ nhánh text fallback
  mới có `thinking` rõ ràng (gửi text = mốc kết thúc turn rõ ràng). Đã live-test qua text fallback
  (2026-08-24): `listening → thinking → speaking → listening` đúng thứ tự.
- `apps/api` hiện chưa có streaming (SSE) cho chat text — Live Voice có nên đợi SSE xong trước, hay
  đi trước và dùng chung hạ tầng streaming/event sau?

## Acceptance criteria

- [ ] ADR chốt transport (WebRTC/WebSocket) + provider đầu tiên (Gemini Live) trước khi code module
      mới ở `apps/api`.
- [ ] User mở voice session trong 1 conversation có sẵn, nói và nhận lại audio response từ agent,
      không cần bấm gửi mỗi lượt (VAD hoạt động).
- [ ] Ngắt lời agent giữa câu (barge-in) hoạt động — agent dừng nói, quay về `listening`.
- [ ] Transcript hiển thị realtime, được lưu vào `Message` của đúng conversation đó, đọc lại được
      qua API `conversation`/`message` hiện có.
- [ ] Tool call phát sinh trong lúc voice hiện ra như trace phụ (tối thiểu ghi log/response tương tự
      chat text hiện tại, chưa cần persist đầy đủ nếu chat text cũng chưa persist — xem "Câu hỏi mở").
- [ ] Gõ text giữa voice session không phá vỡ session — có hành vi rõ ràng (theo quyết định ở "Câu hỏi mở").
- [ ] Verify thật (không mock): 1 kịch bản end-to-end nói chuyện thật qua mic trong `apps/web` dev,
      agent trả lời bằng giọng, có ngắt lời ít nhất 1 lần trong kịch bản test.
