# ADR-0014 — Approval gate cho tool rủi ro cao: `HumanInTheLoopMiddleware` + `AsyncPostgresSaver`

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-24

## Context

ADR-0005 đã nêu ý tưởng "node approval tạm dừng graph chờ duyệt trước khi chạy lệnh trên máy"
nhưng chưa có implementation thật — không checkpoint, không API duyệt, không UI. Roadmap có 2
builtin tool sắp tới: GitHub search/read (rủi ro thấp, không cần gate) và **tạo file/thực thi
lệnh trên máy** (rủi ro cao — model tự quyết định chạy gì, có thể phá dữ liệu/hệ thống thật). Tool
`kind=http` (ADR-0013) đã chốt không cần gate (user tự khai endpoint của chính họ), nhưng tool
chạy lệnh máy là loại rủi ro khác hẳn, cần cơ chế chặn thật trước khi viết.

`chat/graph.py` dùng `langchain.agents.create_agent` (không phải `StateGraph` tự build tay).
Research xác nhận: `langchain` đã có sẵn `HumanInTheLoopMiddleware`
(`langchain.agents.middleware`) tương thích trực tiếp `create_agent` — không cần tự viết node
approval bằng LangGraph thô. Cơ chế này bắt buộc phải có `checkpointer` (LangGraph pause/resume
dựa trên checkpoint) — `langgraph-checkpoint-postgres` đã là dependency có sẵn trong
`pyproject.toml` từ trước nhưng **chưa từng được wire vào code** (grep xác nhận 0 chỗ dùng
`checkpoint`/`Checkpointer` thật trong `app/` trước ADR này).

## Decision

**Wire `AsyncPostgresSaver` (`langgraph.checkpoint.postgres.aio`) làm checkpointer cho
`create_agent`** trong `chat/graph.py::build_agent_executor`/`run_sub_agent`:

- Tạo 1 connection riêng cho checkpointer (dùng `psycopg`, khác SQLAlchemy async engine Ultron
  đang dùng cho phần còn lại — 2 driver khác nhau, không dùng chung pool).
- Gọi `AsyncPostgresSaver.setup()` **1 lần lúc app khởi động** (`main.py` lifespan) — hàm này tự
  tạo bảng riêng của nó (`checkpoints`, `checkpoint_writes`, `checkpoint_blobs`,
  `checkpoint_migrations`) và tự quản lý migration nội bộ của thư viện. **KHÔNG viết migration
  Alembic cho các bảng này** — đây là schema do `langgraph-checkpoint-postgres` tự sở hữu, tách
  biệt hoàn toàn khỏi schema Ultron (không FK, không join). Alembic của Ultron không biết/không
  cần biết về các bảng này.

**`HumanInTheLoopMiddleware`** (`langchain.agents.middleware`) — truyền vào `create_agent(...,
checkpointer=checkpointer, middleware=[HumanInTheLoopMiddleware(interrupt_on={<tool_slug>:
{"allowed_decisions": ["approve", "reject"]}})])`. Chỉ tool nào được đánh dấu rõ (field mới hoặc
danh sách cứng — solution-architect quyết chi tiết) mới nằm trong `interrupt_on`; `kind=http` và
mọi tool khác không bị ảnh hưởng, chạy như cũ.

**`thread_id` = `conversation_id`** — mỗi conversation 1 thread checkpoint, khớp tự nhiên với
domain hiện có (Ultron không có concept "nhiều turn đồng thời trong 1 conversation").

**Chỉ 2 quyết định: `approve`/`reject`** — không làm `edit` (sửa argument trước khi chạy). Không
timeout — turn chờ duyệt vô hạn nếu user không phản hồi (Ultron 1 người dùng, tự chịu trách nhiệm).

**Luồng SSE + API mới** (mở rộng `chat-streaming`, không thay thế):

- Event mới `approval_required` — `{type, tool_name, arguments}` — khi graph pause giữa
  `executor.astream_events()`.
- Endpoint mới `POST /conversations/{id}/chat/approve` — body `{decision: "approve"|"reject"}` —
  resume đúng thread bằng `Command(resume=<decision>)`, tiếp tục stream SSE từ điểm dừng (không
  phải turn mới, không chạy lại từ đầu).

**Verify bằng 1 tool test tối giản** (`_ApprovalTestTool`, echo lại argument, không làm gì thật)
trước khi có builtin tool thật cần gate — không chờ tool nguy hiểm thật mới test được cơ chế.

## Consequences

- ✅ Không tự viết pause/resume bằng tay — dùng đúng middleware + checkpointer đã có sẵn trong
  `langchain`/`langgraph`, ít code tự viết, ít bug tự tạo ra hơn so với tự implement node approval
  thô.
- ✅ Cơ chế build 1 lần, dùng lại được cho MỌI builtin tool nguy hiểm sau này (exec máy, GitHub
  write...) — chỉ cần thêm slug vào `interrupt_on`, không sửa lại graph/service mỗi lần thêm tool
  mới cần gate.
- ⚠️ Thêm 1 loại schema thứ hai trong cùng 1 Postgres database KHÔNG do Alembic quản lý
  (`checkpoints`/`checkpoint_writes`/`checkpoint_blobs`/`checkpoint_migrations`) — khác hẳn mọi
  bảng khác của Ultron. Rủi ro nhầm lẫn khi backup/restore/xem schema (`\dt` sẽ thấy bảng lạ không
  có trong `alembic/versions/`) — cần ghi rõ trong code/docs để người sau không tưởng nhầm là bảng
  bị thiếu migration.
- ⚠️ Thêm 1 driver DB thứ hai (`psycopg`) bên cạnh SQLAlchemy async engine hiện có — 2 connection
  pool riêng tới cùng 1 Postgres, tăng nhẹ số connection tối đa cần cấp cho DB.
- ⚠️ Turn chờ duyệt vô hạn (không timeout) — nếu user quên duyệt, turn đó treo mãi, chiếm 1
  checkpoint chưa dọn. Chấp nhận cho use-case 1 người dùng; nếu sau cần dọn checkpoint cũ, đó là
  quyết định riêng (chưa cần bây giờ).

## Alternatives considered

- **Tự viết node "approval" bằng `StateGraph` tay** (đúng ý ADR-0005 ban đầu, không dùng
  `create_agent`): loại — `chat/graph.py` đã dùng `create_agent` (LangChain agent execution,
  ADR-0005 đã chốt), viết lại bằng `StateGraph` thô nghĩa là 2 cách build graph song song trong
  cùng codebase, không nhất quán; `HumanInTheLoopMiddleware` giải đúng bài toán mà không cần rời
  khỏi `create_agent`.
- **Checkpointer trong memory (`InMemorySaver`)** thay Postgres: loại — Ultron chạy production
  lâu dài (không phải demo), restart server sẽ mất mọi turn đang chờ duyệt; Postgres đã là DB
  chính của Ultron (ADR-0003), dùng `AsyncPostgresSaver` tận dụng luôn instance đã có, không thêm
  hạ tầng mới (không thêm Redis/SQLite riêng).
- **Timeout tự động reject sau X phút**: loại ở bản này — thêm background job/scheduler chỉ để
  dọn turn treo, trong khi Ultron 1 người dùng và có thể tự vào duyệt bất cứ lúc nào — độ phức tạp
  không tương xứng lợi ích ở quy mô hiện tại.
- **Cho phép `edit` (sửa argument) ngoài approve/reject**: loại ở bản này — cần thêm UI form sửa
  argument theo đúng `args_schema` của tool đó (phức tạp hơn nhiều so với 2 nút), chưa có nhu cầu
  thật rõ ràng; approve/reject đã đủ cho mục tiêu an toàn cơ bản.

## Addendum (2026-08-30) — Nested approval khi sub-agent gọi tool rủi ro

`chat/graph.py::run_sub_agent` (chạy sub-agent lồng bên trong 1 lần gọi tool của agent cha) **cố ý
không gắn checkpointer/`HumanInTheLoopMiddleware`** — comment sẵn trong code giải thích: pause lồng
trong lúc agent cha đang chạy là nested interrupt, phức tạp hơn hẳn phạm vi ADR này. Hệ quả thật
(phát hiện khi viết [`docs/features/orchestrator-v2.md`](../features/orchestrator-v2.md)): sub-agent
hiện **có thể gọi tool trong `TOOLS_REQUIRING_APPROVAL` (vd `run-command`) mà KHÔNG qua gate nào** —
không phải giới hạn tính năng, là khoảng trống an toàn thật.

**Quyết định (fail-closed, không nested pause)**: `run_sub_agent`/`_build_sub_agent_tool` loại bỏ
khỏi danh sách tool truyền cho sub-agent bất kỳ tool nào nằm trong `TOOLS_REQUIRING_APPROVAL` hoặc
có `kind == "mcp"` (cùng điều kiện gate ở `_human_in_the_loop_middleware` cho turn top-level) —
sub-agent **không có khả năng gọi** tool rủi ro cao, thay vì gọi được nhưng không ai duyệt. Agent
cha (turn top-level, có gate) vẫn gọi được các tool đó bình thường.

Lý do chọn fail-closed thay vì "pause cả turn cha" (phương án phức tạp hơn — nested interrupt, cần
thiết kế lại checkpoint đa tầng): đơn giản, an toàn hơn theo mặc định, và khớp quy mô hiện tại (1
người dùng, chưa có nhu cầu thật cho sub-agent chạy lệnh máy/MCP rủi ro cao). Nếu sau này cần
sub-agent gọi tool rủi ro cao thật, đó là quyết định mở rộng riêng (ADR mới), không mặc định cho
phép như hiện tại.
