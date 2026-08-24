# Feature: Wire Tool vào chat execution (builtin/mcp/http)

Status: accepted

## Vấn đề / động lực

`Tool` (ADR-0007) đã CRUD xong và gán được vào từng agent qua `AgentTool` (many-to-many), nhưng lúc
chat thật, `chat/graph.py::build_agent_executor` chỉ build 1 tool ẩn — "gọi sub-agent"
(`_build_sub_agent_tool`). Danh sách `AgentTool` của agent hiện tại **không được đọc** để build tool
thật cho `create_agent`. Kết quả: user tạo `Tool` row (builtin/mcp/http), gán vào agent qua API,
nhưng agent gọi model chat vẫn không có khả năng gọi tool đó — CRUD "cho có", không có tác dụng thật.

Bản đầu tiên thử của việc này là "thêm 1 ô form JSON tay cho `config`" — user bác đề xuất này, vì 3
`kind` hiện có bản chất khác hẳn nhau: `builtin` là code Python cố định đã có trong repo, `mcp` là
protocol client gọi 1 MCP server ngoài, `http` là user tự khai báo 1 endpoint bất kỳ qua UI (không
viết code). Ép cả 3 vào chung 1 ô JSON tự do là né tránh thiết kế, không phải giải quyết vấn đề.

Xem `docs/research/agent-tool-execution.md` cho research chi tiết (n8n `$fromAI`, OpenAI function
calling, Composio custom tools) — insight chính: dù kind nào, đích cuối luôn giống nhau (1 callable +
`name` + `description` + `args_schema` cho LangChain/LangGraph), nhưng cách tạo ra đích đó khác hẳn
theo kind — cần 1 abstraction "build tool theo kind" (có precedent trong repo: `ProviderAdapter`,
ADR-0012), không phải 1 hàm build chung xử lý if/elif config tự do.

## Mục tiêu (Goals) — draft, chờ user confirm

- Có 1 abstraction rõ ràng để build "1 `Tool` row → 1 LangGraph tool thật" theo `kind`, tách biệt
  code từng kind (không đụng nhau khi thêm/sửa 1 kind).
- `chat/graph.py::build_agent_executor` đọc `AgentTool` của agent (và của mọi sub-agent lồng, đúng
  tinh thần đa tầng đã có) → build đúng list tool thật, cộng thêm bên cạnh tool ẩn gọi sub-agent hiện
  có (không thay thế, không đổi hành vi delegate đang chạy).
- **`kind=http` chạy được thật hết pipeline** (đây là kind duy nhất có implementation đầy đủ ở bản
  này):
  - User khai báo qua UI form (không gõ JSON Schema tay) — xem mockup
    `docs/mockups/agent-tool-execution.html`: method + URL cố định + headers (name/value, value có
    thể chứa placeholder) + query params (tương tự) + body (JSON, có placeholder) + 1 danh sách
    riêng "tham số AI điền" (tên, mô tả, type: string/number/boolean/json) tham chiếu bằng
    `{{tên_tham_số}}` trong URL/header/query/body.
  - Ultron dựng `args_schema` (Pydantic model runtime) từ đúng danh sách "tham số AI điền" đó —
    model chỉ thấy các tham số này, không thấy giá trị tĩnh (header secret, query cố định).
  - Khi model gọi tool, Ultron thực thi HTTP request thật (thay placeholder bằng giá trị model điền),
    trả kết quả làm tool output cho model tiếp tục turn.
  - Data shape mới cho `kind=http` thay thế `config: dict` tự do hiện tại bằng 1 schema có cấu trúc
    rõ (không còn JSON tự do) — chi tiết field/bảng để `solution-architect` quyết dựa trên Goals này,
    không tự chốt ở spec.
- `kind=builtin`: có sẵn interface/registry (kiểu `Protocol` + dict tĩnh, giống `PROVIDERS` ở
  `provider_adapter.py`) để sau này thêm tool Python code thật (roadmap riêng "GitHub search/read")
  — bản này **không cần** có bất kỳ builtin tool cụ thể nào chạy được, chỉ cần chỗ đứng kiến trúc.
- `kind=mcp`: **không implement** ở bản này (roadmap "Tool thật tự viết ... MCP client (Jira/
  Confluence)" là hạng mục riêng) — chỉ đảm bảo kiến trúc "build tool theo kind" không cản trở việc
  thêm implementation mcp sau (không cần đổi lại `Tool.kind`/interface tổng khi làm mcp).

## Ngoài phạm vi (Non-goals) — draft, chờ user confirm — KHÔNG tự chốt

- MCP client thật (kết nối, list tool từ server ngoài) — để hạng mục roadmap riêng.
- Builtin tool cụ thể nào (GitHub search/read...) — để hạng mục roadmap riêng.
- OAuth flow / credential broker cho `http` tool — nếu cần secret, user tự dán giá trị tĩnh vào 1
  header (giống n8n) — nhưng "lưu ở đâu, có mã hoá không" là câu hỏi mở, không tự chốt Non-goal ở
  đây vì có thể cần đổi (xem Câu hỏi mở #2).
- Approval gate runtime trước khi gọi `http` tool ra ngoài — **để "Câu hỏi mở"**, không tự đưa vào
  Non-goals vì roadmap có nhắc ADR-0005 approval gate cho "tool chạy lệnh máy" (rủi ro tương tự có
  thể áp dụng cho tool gọi HTTP ra ngoài).
- Ghi `ToolCall` (bảng `tool_calls` đã có ở domain `conversation`) khi `http` tool được gọi — roadmap
  đang có dòng riêng "Ghi lại tool-call của orchestrator (gọi sub-agent)" nói về sub-agent delegation,
  chưa rõ có dùng chung cơ chế cho `http` tool không — xem Câu hỏi mở #6.

## Quyết định (2026-08-24)

1. **Data shape `kind=http`**: theo đúng hướng research (n8n-style) — tách "HTTP request template"
   (method/URL cố định/headers/query/body, có placeholder) và "danh sách tham số AI điền"
   (name/description/type) thành 2 khối riêng trong schema mới thay `config: dict` tự do. Chi tiết
   field/bảng để ADR + `solution-architect` quyết.
2. **Lưu secret**: **plaintext trong `tools.config`** (JSONB, giữ nguyên như hiện tại) — không tái
   dùng module `credential` (ADR-0010) ở bản này, làm đơn giản trước; nếu sau cần mã hoá thì quay
   lại quyết định này (không tự động nâng cấp ngầm).
3. **Approval gate**: **không cần** — Ultron 1 người dùng, tự khai tool của chính họ, không áp
   ADR-0005 (dành cho tool chạy lệnh trên máy, rủi ro khác hẳn) cho `http` tool.
4. **Placeholder**: **chỉ ở header/query/body value** — URL gốc cố định do user khai, model không
   tự đổi được endpoint gọi tới đâu.
5. **Cần 1 ADR riêng** ("Tool execution architecture: builder theo kind + registry", tham khảo
   style `ProviderAdapter`/ADR-0012) trước khi `solution-architect` ra plan chi tiết — do
   `adr-writer` soạn.
6. **Giới hạn an toàn khi gọi ra ngoài** (không hỏi lại, quyết định mặc định hợp lý — không phải
   kiến trúc, sửa được sau nếu cần): timeout mặc định 30s; không whitelist domain (nhất quán với
   quyết định #3 — user tự chịu trách nhiệm tool họ tự khai); truncate response về tối đa ~8000 ký
   tự trước khi đưa cho model (tránh nuốt hết context window 1 lần gọi tool).
7. **Response không phải JSON/text**: chỉ hỗ trợ JSON/text (thử decode UTF-8) ở bản đầu — gặp loại
   khác (binary, ảnh...) trả lỗi rõ ràng cho model biết, không cố xử lý.
8. **Ghi `ToolCall`**: **ngoài phạm vi bản này** — nhất quán với gap đã ghi nhận riêng ở roadmap
   ("Ghi lại tool-call của orchestrator gọi sub-agent" cũng chưa làm) — `http` tool call chỉ có
   trong SSE event `tool_call_start`/`tool_call_end` (đã có, chat-streaming) lúc đang chạy, chưa
   persist ra bảng `tool_calls`.

## Acceptance criteria

- [ ] `solution-architect` có plan chi tiết dựa trên Goals/Non-goals + Quyết định ở trên, sau khi
      ADR ("Tool execution architecture") được viết.
- [ ] Tạo `Tool` kind=http qua UI form (không viết JSON tay) — điền method/URL/headers/query/body +
      danh sách tham số AI điền — lưu đúng schema mới.
- [ ] Agent có gán `Tool` kind=http — chat thật gọi được tool đó (model tự điền tham số, Ultron
      thực thi HTTP request, trả kết quả cho model tiếp tục turn) — verify qua browser thật với 1
      endpoint HTTP thật (không mock).
- [ ] `kind=builtin`: có registry (`Protocol` + dict tĩnh) đứng sẵn, build được thành LangGraph tool
      nếu có 1 entry test trong registry — không cần tool thật nào hoạt động.
- [ ] `kind=mcp`: không crash — agent có tool kind=mcp gán vào vẫn chat được bình thường (bỏ qua
      tool đó, log warning), không implement gì thêm.
