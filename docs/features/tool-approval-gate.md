# Feature: Approval gate cho tool rủi ro cao

Status: accepted

## Vấn đề / động lực

Roadmap ghi nợ 2 builtin tool sắp tới: GitHub search/read (rủi ro thấp) và **tạo file/thực thi
lệnh trên máy** (rủi ro cao — model có thể tự quyết định chạy lệnh gì, có thể xoá file, đổi cấu
hình hệ thống). ADR-0005 đã mô tả ý tưởng "node approval tạm dừng graph chờ duyệt" nhưng **chưa có
bất kỳ implementation thật nào** — không checkpoint, không API duyệt, không UI. `kind=http` tool
(ADR-0013) không cần gate (user tự khai endpoint của chính họ) nhưng tool chạy lệnh máy là loại
rủi ro khác hẳn — cần cơ chế approval thật trước khi builtin tool nguy hiểm đó được viết.

## Mục tiêu (Goals) — draft, chờ user confirm

- Agent có thể "đề xuất" gọi 1 tool đã đánh dấu cần duyệt — graph tạm dừng, KHÔNG thực thi tool
  đó, cho tới khi user duyệt qua API/UI.
- Cơ chế dùng đúng thứ đã có sẵn trong `langchain`/`langgraph` (không tự viết pause/resume từ
  đầu) — `create_agent(..., checkpointer=..., middleware=[HumanInTheLoopMiddleware(interrupt_on=...)])`
  (xem "Thiết kế").
- `chat/service.py::send()` (đang stream SSE — xem `chat-streaming` feature) thêm được 1 event
  mới báo "cần duyệt tool X với argument Y" — client biết để hiện UI hỏi duyệt, không phải đoán
  qua im lặng/timeout.
- Có 1 endpoint mới để user gửi quyết định (duyệt/từ chối) — graph tiếp tục đúng từ điểm dừng
  (không chạy lại từ đầu turn).
- `apps/web`: UI hỏi duyệt (hiện tool name + argument model muốn gọi, 2 nút Duyệt/Từ chối) ngay
  trong luồng chat đang xem.

## Ngoài phạm vi (Non-goals)

- Không viết bất kỳ builtin tool cụ thể nào cần gate (GitHub, exec-lệnh-máy) — đó là hạng mục
  riêng SAU cái này (đúng thứ tự đã chốt với user 2026-08-24). Cơ chế này build xong, verify bằng
  1 tool test tối giản (không phải tool thật), rồi mới tới lượt viết tool thật dùng nó.
- Không làm quyết định "edit" (sửa argument trước khi chạy) — `HumanInTheLoopMiddleware` hỗ trợ
  `approve`/`edit`/`reject`/`respond`, nhưng bản đầu chỉ cần `approve`/`reject` (xem "Câu hỏi mở").
- Không đổi cơ chế lưu schema qua Alembic — `langgraph-checkpoint-postgres` tự quản lý bảng riêng
  của nó (`checkpoints`, `checkpoint_writes`, `checkpoint_blobs`, `checkpoint_migrations`) qua
  `AsyncPostgresSaver.setup()`, KHÔNG qua migration Alembic của Ultron (xem "Thiết kế").
- Không áp gate cho `kind=http` tool (ADR-0013 đã chốt: không cần) — chỉ áp cho tool tương lai
  được đánh dấu rõ (builtin, rủi ro cao).

## Thiết kế

### Cơ chế thật (đã research, không tự nghĩ pattern riêng)

- `langgraph-checkpoint-postgres` (đã là dependency trong `pyproject.toml`, **chưa wire**) —
  `AsyncPostgresSaver` cần gọi `.setup()` 1 lần để tạo bảng riêng của nó (KHÔNG qua Alembic — tự
  quản lý migration nội bộ, tách biệt hoàn toàn schema Ultron). Cần 1 connection string riêng
  (dùng `psycopg`, khác SQLAlchemy async engine Ultron đang dùng cho phần còn lại).
- `create_agent(chat_model, tools=..., checkpointer=checkpointer, middleware=[HumanInTheLoopMiddleware(interrupt_on={"<tool_slug>": {"allowed_decisions": ["approve", "reject"]}})])`
  — middleware này có sẵn trong `langchain.agents.middleware`, tương thích trực tiếp
  `create_agent` (đang dùng ở `chat/graph.py`), không cần tự viết node approval bằng tay.
- Khi model gọi 1 tool nằm trong `interrupt_on`, graph tạm dừng (LangGraph `interrupt()` nội bộ
  của middleware) — `executor.astream_events()` (đang dùng ở `chat/service.py::send()` cho SSE
  streaming) sẽ ngừng chảy giữa turn, cần đọc state để biết đang chờ duyệt.
- Resume: gọi lại `executor.astream_events(Command(resume=<decision>), config={"configurable": {"thread_id": ...}})`
  — decision dạng LangChain quy định (approve/reject) — cần đúng `thread_id` khớp lúc pause.
- **`thread_id` = `conversation_id`** (đề xuất, xem "Câu hỏi mở" nếu cần khác) — mỗi conversation
  1 thread checkpoint riêng, khớp tự nhiên với domain hiện có.

### Luồng SSE + API mới

- Thêm event `approval_required` — `{type, tool_name, arguments}` — khi graph pause.
- Thêm endpoint mới `POST /conversations/{id}/chat/approve` — body `{decision: "approve"|"reject"}`
  — resume graph đúng thread, tiếp tục stream SSE từ đó (response cũng là SSE, tiếp nối turn đang
  chờ, không phải turn mới).
- `apps/web`: nhận `approval_required` → hiện UI hỏi duyệt ngay trong thread (không phải modal
  riêng, tương tự cách hiện `tool_call_start`/`tool_call_end` đã có) → gửi quyết định qua endpoint
  mới → tiếp tục nhận stream.

## Quyết định (2026-08-24)

1. **Verify bằng 1 tool test tối giản** — `_ApprovalTestTool` (echo lại argument, không làm gì
   thật), đăng ký tạm trong `TOOL_BUILDERS`/registry chỉ để verify pause/resume qua UI thật. Chưa
   viết builtin tool thật (exec/file) — đó là bước SAU, dùng lại đúng cơ chế này.
2. **Chỉ approve/reject** — không làm `edit`. `HumanInTheLoopMiddleware(interrupt_on={"<slug>":
   {"allowed_decisions": ["approve", "reject"]}})`.
3. **Không cần timeout** — turn chờ duyệt vô hạn nếu user không phản hồi, không thêm logic
   auto-reject/background job.
4. **`thread_id` = `conversation_id`** — giữ như đề xuất (không ai phản đối).
5. **Cần 1 ADR riêng** ("Approval gate: HumanInTheLoopMiddleware + AsyncPostgresSaver checkpointer")
   trước khi code — do tôi (main thread) viết trực tiếp, không giao subagent.

## Acceptance criteria

- [ ] `create_agent` có `checkpointer` (`AsyncPostgresSaver`, đã `.setup()` xong 1 lần) +
      `middleware=[HumanInTheLoopMiddleware(...)]` cho tool nằm trong `interrupt_on`.
- [ ] Gọi `_ApprovalTestTool` qua chat thật (SSE) → nhận event `approval_required` — turn KHÔNG
      chạy tiếp tự động.
- [ ] `POST /conversations/{id}/chat/approve` với `decision: "approve"` → tool chạy tiếp thật,
      turn hoàn tất, message persist đúng.
- [ ] `decision: "reject"` → tool KHÔNG chạy, turn kết thúc theo nhánh reject (model biết bị từ
      chối, trả lời phù hợp — không crash).
- [ ] `apps/web`: UI hỏi duyệt hiện trong thread lúc đang chat (không phải trang riêng), có nút
      Duyệt/Từ chối, gửi đúng endpoint mới.
- [ ] Verify thật qua browser (không mock) — chat gọi `_ApprovalTestTool`, thấy prompt duyệt,
      bấm Duyệt → tool chạy tiếp; thử lại với Từ chối → tool không chạy.
