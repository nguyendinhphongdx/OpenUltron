# Feature: SSE Streaming cho chat text

Status: accepted

## Vấn đề / động lực

`POST /conversations/{id}/chat` hiện là request/response thường — client chờ cả turn (kể cả khi
orchestrator gọi sub-agent, có thể mất vài giây tới hàng chục giây) rồi mới nhận được response đầy
đủ. Trong lúc chờ, `apps/web` chỉ hiện bubble "đang trả lời" tĩnh (3 dot), không có tín hiệu tiến
độ thật nào — trải nghiệm kém hơn hẳn ChatGPT/Gemini (trả token ngay khi model sinh ra). Ultron đã
làm streaming cho Ollama pull model (ADR-0011, SSE) và cho voice (ADR-0009, WebSocket) — chat text
là chỗ cuối còn lại vẫn "chờ rồi trả 1 lần".

## Mục tiêu (Goals)

- `POST /conversations/{id}/chat` trả response dạng stream (SSE) — client nhận được token/chunk
  text ngay khi model sinh ra, không phải chờ cả turn xong.
- Tương thích với orchestrator gọi sub-agent (ADR-0006) — khi model đang chạy tool gọi sub-agent,
  client biết được (tối thiểu: 1 event dạng "đang chạy tool X"), không chỉ im lặng chờ.
- Message cuối cùng (đã ghép đủ) vẫn được persist vào `Message` đúng như hiện tại — không đổi
  domain model, chỉ đổi cách response bay tới client.
- `apps/web`: `MessageComposer`/`MessageThread` hiện text tăng dần theo stream, thay bubble "đang
  trả lời" tĩnh — giữ nguyên optimistic user-bubble đã có.
- Lỗi giữa lúc đang stream (model lỗi, thiếu credential...) phải truyền được cho client biết rõ
  nguyên nhân — không chỉ ngắt kết nối im lặng (đã có tiền lệ message rõ ràng ở
  `ProviderConfigError`, xem `chat/service.py`).

## Ngoài phạm vi (Non-goals)

- Không đổi domain model `Conversation`/`Message`/`ToolCall` — turn hoàn chỉnh vẫn persist đúng 1
  `Message` role=assistant như hiện tại (không tách message theo từng chunk).
- Không làm streaming cho Live Voice Agent — module đó đã có transport riêng (WebSocket, ADR-0009),
  không liên quan tới HTTP SSE của chat text.
- Chưa ghi `tool_calls` đầy đủ (gap đã ghi nhận trong roadmap từ trước feature này) — chỉ cần 1
  event tạm cho biết "đang chạy tool", chưa cần persist tool-call record.
- Không đổi cách LangGraph orchestrator quyết định gọi sub-agent — chỉ đổi transport để client thấy
  được tiến trình đó, logic delegate (`chat/graph.py`) giữ nguyên.
- Không dùng thư viện SSE/streaming mới ngoài chuẩn web (`ReadableStream`/`fetch`, `StreamingResponse`
  của FastAPI — đã dùng cho ADR-0011) — không cần ADR riêng cho phần transport vì đã có tiền lệ.

## Thiết kế

### Luồng

- `chat/service.py::send()` đổi từ `return MessageRead` sang trả 1 `AsyncIterator` các SSE event,
  dùng `graph.astream_events(..., version="v2")` (LangGraph hỗ trợ sẵn — không cần tự viết token
  buffering) để lấy token delta + tool-call start/end event.
- Router đổi `response_model=MessageRead` (JSON) sang `StreamingResponse(media_type="text/event-stream")`
  — cùng pattern `GET /ollama/pull` (ADR-0011), khác chỗ: chat dùng `POST` (nội dung message có thể
  dài, không hợp đưa vào query string như Ollama `model` param).
- Event type (JSON qua `data:`, xem "Quyết định"):
  - `delta` — `{type, text}` — 1 đoạn text model vừa sinh.
  - `tool_call_start` — `{type, name}` — orchestrator vừa gọi sub-agent.
  - `tool_call_end` — `{type, name}` — sub-agent đã trả kết quả.
  - `error` — `{type, message}` — lỗi giữa lúc stream (message rõ nguyên nhân, giống
    `ProviderConfigError` hiện tại).
  - `done` — `{type, message_id, seq}` — hết turn, `Message` đã persist (để `apps/web` biết stream
    xong, không cần đoán qua im lặng).
- Sau khi stream xong (hoặc lỗi), vẫn `message_service.append(role="assistant", content=<ghép đủ
  delta>)` — persist giống code hiện tại, chỉ khác lúc nào gọi (cuối stream, không phải sau khi có
  `ainvoke()` trả 1 lần).
- `apps/web`: `useSendMessage` đổi từ `useMutation` (chờ 1 response) sang tự quản lý qua `fetch()` +
  đọc `response.body` (`ReadableStream`), parse từng SSE frame (`data: ...\n\n`) — không dùng
  `EventSource` (chỉ hỗ trợ GET). `MessageThread` nhận state "đang stream" + text tăng dần, thay
  animation dot tĩnh hiện tại bằng nội dung thật.

### Rủi ro / điểm cần cẩn thận

- `astream_events` của LangGraph phát ra rất nhiều loại event nội bộ (on_chat_model_stream,
  on_tool_start...) — cần filter đúng loại cần forward, tránh leak chi tiết implementation ra
  client (giống bug đã gặp ở voice: `part.thought` leak reasoning trace — ADR-0009).
- Nếu client disconnect giữa stream (đóng tab, mất mạng) — server vẫn nên chạy tới cuối và persist
  message đầy đủ (giống hành vi hiện tại không phụ thuộc client có đang xem hay không), không huỷ
  ngang generation.

## Quyết định (2026-08-24)

- `tool_call` có cả 2 event: `tool_call_start` (kèm tên sub-agent) và `tool_call_end` — UI hiện
  "đang chạy tool X" đúng lúc, tắt khi xong, giống `using_tool` đã làm ở voice (ADR-0009).
- Format: **JSON cho mọi loại event** (`data: {"type": "delta", "text": "..."}`,
  `{"type": "tool_call_start", "name": "..."}`, ...) — nhất quán 1 kiểu parse ở `apps/web`, giống
  style `voice/service.py` đang dùng.
- **Không giữ fallback JSON thường** — đổi thẳng `POST /conversations/{id}/chat` sang SSE luôn, chỉ
  1 client (`apps/web`) đang gọi endpoint này.

## Acceptance criteria

- [ ] Gửi message qua `apps/web`, thấy text hiện tăng dần (không phải chờ rồi hiện 1 lần) — verify
  thật qua browser, không mock.
- [ ] Orchestrator gọi sub-agent trong lúc chat — client thấy tín hiệu "đang chạy tool" trong lúc
  chờ, không chỉ im lặng.
- [ ] Lỗi giữa lúc stream (vd rút credential Gemini giữa chừng) — client hiện message lỗi rõ ràng,
  không phải "Có lỗi xảy ra, vui lòng thử lại." chung.
- [ ] Sau khi stream xong, `GET /conversations/{id}/messages` trả đúng 1 message assistant hoàn
  chỉnh (không thiếu/lặp nội dung so với text đã hiện lúc stream).
- [ ] Backend test: `chat/service.py` có test cho luồng stream (mock graph, assert đúng thứ tự
  event + persist đúng nội dung cuối).
