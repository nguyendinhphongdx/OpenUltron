# ADR-0011 — Pull model Ollama qua UI, stream tiến trình bằng SSE

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-23

## Context

Model catalog (ADR-0010) đã cho phép tạo `Model` với `model_id` tự do (không giới hạn theo catalog),
nhưng với provider tự host `ollama`, user vẫn phải tự `ollama pull <model>` bằng tay ngoài terminal
trước khi tạo `Model` trỏ tới model đó — không có UI. Nhiều sản phẩm tương tự (LM Studio, Open WebUI)
đã cho pull model tự host ngay trong UI, có progress bar.

Ollama có API thật cho việc này: `POST /api/pull` (tới `ollama_base_url` đã có trong `Settings`),
body `{"name": "<model>:<tag>", "stream": true}`, trả về **NDJSON streaming** — mỗi dòng 1 object
`{"status": "...", "completed": <bytes>, "total": <bytes>, "digest": "..."}`, kết thúc bằng
`{"status": "success"}`. Không có API JSON chính thức để list toàn bộ model có sẵn trên Ollama
library (trang https://ollama.com/library là web, không phải REST endpoint) — nên phần "browse
catalog" phải là **danh sách tĩnh do Ultron tự duy trì trong code**, không phải tra live từ Ollama.

Đây là lần đầu Ultron cần stream 1 tiến trình dài (pull có thể mất vài phút) từ backend ra
`apps/web` — cùng bài toán với "Streaming (SSE) cho chat" đã ghi trong roadmap (`Đang làm/tiếp
theo`) nhưng chưa làm — quyết định ở đây (chọn SSE) áp dụng luôn cho tiền lệ đó, không phải quyết
riêng cho tính năng này.

## Decision

**Chọn SSE (Server-Sent Events), không WebSocket**, cho việc stream tiến trình pull:

- 1 chiều server → client là đủ (client không cần gửi gì lại giữa lúc pull, khác voice session —
  ADR-0009 — nơi WebSocket cần vì 2 chiều audio thật).
- FastAPI `StreamingResponse(media_type="text/event-stream")`, đơn giản hơn quản lý WebSocket
  connection lifecycle cho 1 luồng 1 chiều.
- Tiền lệ này dùng lại được cho "Streaming chat" (roadmap) sau — không phải quyết riêng lẻ.

**Module mới `apps/api/app/modules/ollama/`** (không có bảng DB riêng — giống tiền lệ module
`voice`, ADR-0009 — chỉ proxy/relay, không tự lưu gì mới):

- `catalog.py` — danh sách tĩnh model Ollama phổ biến để browse (tên, mô tả ngắn, tag gợi ý) —
  KHÔNG có size/parameter count cụ thể nếu không chắc chắn nguồn (giữ đúng tinh thần
  `model_catalog.py` của ADR-0010: không bịa số liệu).
- `service.py` — `list_catalog()`, `pull(model: str) -> AsyncIterator[dict]` (gọi Ollama
  `/api/pull`, forward từng NDJSON line thành event), `list_installed()` (Ollama `GET /api/tags` —
  model đã pull thật trên máy, để UI biết cái nào đã có/đang thiếu).
- `router.py` — `GET /ollama/catalog`, `GET /ollama/installed`, `GET /ollama/pull?model=...` (SSE,
  GET vì EventSource browser API chỉ hỗ trợ GET).

**Frontend**: thêm vào dialog "Model & Credential" đã có (ADR-0010) — khi provider đang chọn là
`ollama`, cột giữa thêm tab/section "Catalog" (browse + nút Pull) cạnh danh sách model đã tạo trong
Ultron, dùng `EventSource` đọc SSE, progress bar theo `completed/total` mỗi event.

## Consequences

- ✅ Dùng lại đúng API thật của Ollama, không cần suy đoán — `service.py` gọi endpoint đã biết rõ
  shape.
- ✅ Tiền lệ SSE sẵn cho streaming chat sau, không phải quyết lại từ đầu.
- ⚠️ Catalog browse là **danh sách tĩnh tự duy trì** — không tự cập nhật khi Ollama library có model
  mới, cần sửa code khi muốn thêm. Chấp nhận vì Ollama không có API JSON chính thức để tra động;
  nếu sau này Ollama công bố API đó, có thể đổi từ static sang tra live (không phải ADR mới, chỉ là
  implementation detail).
- ⚠️ Pull chạy trong request SSE đang mở — nếu client đóng tab giữa lúc pull, `service.py` cần xử lý
  `asyncio.CancelledError` gọn gàng (không để process Ollama pull orphan chạy vô ích) — chi tiết
  implementation, không phải quyết định ADR.
- ⚠️ Chỉ áp dụng cho `ollama` — `sglang` (self-host khác) không dùng cơ chế pull này (SGLang serve
  model đã có sẵn trên đĩa qua CLI riêng, không qua HTTP pull), không mở rộng ADR này cho sglang.

## Alternatives considered

- **WebSocket**: loại — luồng 1 chiều không cần 2 chiều, SSE đơn giản hơn cho case này.
- **Polling** (client hỏi trạng thái theo chu kỳ): loại — UX kém mượt hơn, và không tạo được hạ
  tầng dùng lại cho streaming chat sau (đã chọn qua AskUserQuestion với user).
- **Tra live danh sách model Ollama library** (scrape web hoặc gọi API không chính thức): loại —
  không có API JSON chính thức, scrape HTML dễ vỡ khi Ollama đổi trang web, rủi ro cao hơn giá trị
  mang lại so với danh sách tĩnh tự duy trì.
