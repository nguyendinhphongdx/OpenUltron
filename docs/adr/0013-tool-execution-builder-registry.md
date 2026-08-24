# ADR-0013 — Tool execution: build LangGraph tool theo `Tool.kind` qua registry, thay if/elif config tự do

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-24

## Context

[ADR-0007](0007-resource-model-provider-tool-kb.md) đã có entity `Tool`/`AgentTool` (CRUD qua API,
gán được vào từng agent), nhưng `chat/graph.py::build_agent_executor` chưa hề đọc `AgentTool` để
build tool thật — chỉ có `_build_sub_agent_tool` cho tool ẩn "gọi sub-agent" (ADR-0006). Kết quả:
user tạo `Tool` row, gán vào agent qua API, nhưng agent chat vẫn không gọi được tool đó — CRUD "cho
có", không có tác dụng thật. Xem `docs/features/agent-tool-execution.md` (spec, accepted) cho đầy
đủ Goals/Non-goals.

`Tool.kind` có 3 giá trị cố định biết trước: `builtin` (code Python có sẵn trong repo), `mcp`
(protocol client gọi MCP server ngoài), `http` (user tự khai 1 endpoint bất kỳ qua UI, không viết
code). Bản đầu tiên thử của việc này là thêm 1 ô form JSON tay cho `config` — user bác đề xuất này,
vì 3 kind bản chất khác hẳn nhau, ép chung 1 JSON tự do là né tránh thiết kế, không phải giải quyết
vấn đề.

Research (`docs/research/agent-tool-execution.md` — n8n `$fromAI`, OpenAI function calling,
Composio custom tools) cho thấy insight chung: dù kind nào, đích cuối luôn giống nhau (1 callable +
`name` + `description` + `args_schema` cho LangChain/LangGraph), nhưng cách tạo ra đích đó khác hẳn
theo kind. Đây đúng hình dạng bài toán ADR-0012 (`ProviderAdapter`) đã giải: N cách làm khác nhau
cho cùng 1 "trục" cố định (provider ở đó, kind ở đây), if/elif rải rác không scale khi thêm implementation
cho từng kind mà không đụng code của kind khác.

## Decision

**1 `Protocol` `ToolBuilder`** (`app/modules/tool/builder.py` hoặc tương đương), tối thiểu 1
method thật sự cần — dựng LangChain tool từ 1 `AgentTool`/`Tool` row:

```python
class ToolBuilder(Protocol):
    def build(self, tool: Tool) -> BaseTool | None: ...
```

`build` trả `None` (không raise) khi kind chưa có implementation thật (vd `mcp`) — cho phép registry
bỏ qua tool đó và log warning, không crash graph.

**1 registry tĩnh** `TOOL_BUILDERS: dict[str, ToolBuilder]` theo `kind` — dict thường, **KHÔNG**
dynamic plugin discovery/entry-point, giống lý luận ADR-0012: 3 kind cố định biết trước (`builtin`,
`mcp`, `http`), thêm implementation cho 1 kind = sửa/viết 1 class implement `ToolBuilder` + đăng ký
lại đúng key trong dict, không cần cơ chế tự động scan/discover.

- `HttpToolBuilder`: implementation đầy đủ ở ADR này — parse `Tool.config` (schema mới, xem dưới),
  dựng `args_schema` runtime từ "danh sách tham số AI điền", trả 1 `BaseTool` thực thi HTTP request
  thật khi model gọi.
- `BuiltinToolBuilder`: chỉ đứng sẵn trong registry (class implement `ToolBuilder`, `build` có thể
  raise `NotImplementedError` hoặc trả `None` tuỳ solution-architect quyết chi tiết) — **không** cần
  bất kỳ builtin tool cụ thể chạy được ở bản này (roadmap riêng "Tool thật tự viết", GitHub
  search/read...) sẽ thêm entry sau, không đổi lại interface tổng.
- `McpToolBuilder`: **không implement** — `build` trả `None`, registry log warning và bỏ qua tool
  đó. Agent có gán tool `kind=mcp` vẫn chat được bình thường (không crash), chỉ thiếu đúng tool đó.

`chat/graph.py::build_agent_executor` đọc `AgentTool` của agent (và mọi sub-agent lồng, đúng tinh
thần đa tầng ADR-0006) → gọi `TOOL_BUILDERS[tool.kind].build(tool)` cho từng tool đã gán → cộng
thêm list tool này **bên cạnh** tool ẩn gọi sub-agent hiện có (`_build_sub_agent_tool`) — không thay
thế, không đổi hành vi delegate đang chạy.

**Data shape mới cho `kind=http`** — `Tool.config` (vẫn JSONB, không đổi cột) đổi từ JSON tự do
sang schema Pydantic có cấu trúc, tách 2 khối:

- **HTTP request template**: `method`, `url` (cố định, **không** chứa placeholder — model không tự
  đổi được endpoint gọi tới đâu), `headers` (list name/value), `query` (list name/value), `body`
  (JSON, có thể chứa placeholder). Placeholder dạng `{{tên_tham_số}}` **chỉ hợp lệ** ở
  header/query/body value.
- **Danh sách tham số AI điền**: list `{name, description, type: string|number|boolean|json}` —
  Ultron dựng `args_schema` (Pydantic model runtime, `pydantic.create_model` hoặc tương đương) từ
  đúng danh sách này. Model chỉ thấy các tham số này qua tool schema — không thấy giá trị tĩnh
  (header secret, query cố định, URL).

Khi model gọi tool: `HttpToolBuilder` thay `{{tên_tham_số}}` bằng giá trị model điền trong
header/query/body, thực thi HTTP request thật, trả kết quả làm tool output.

**Secret (API key...) trong `kind=http`**: lưu **plaintext trong `tools.config`** (field JSONB hiện
có, không đổi) — **không** tái dùng module `credential` (ADR-0010) ở quyết định này. Đơn giản hoá
có chủ đích cho bản đầu, xem "Alternatives considered" cho lý do cụ thể.

**Không có approval gate** khi gọi `http` tool ra ngoài — khác ADR-0005 (approval gate cho tool
chạy lệnh trên máy, rủi ro khác hẳn: thực thi code cục bộ vs gọi HTTP endpoint do chính user khai).
Ultron 1 người dùng (AGENTS.md rule 6), user tự khai tool của chính họ, không cần duyệt lại hành
động của chính mình.

**Giới hạn an toàn mặc định** khi `HttpToolBuilder` thực thi request:

- Timeout 30s.
- Không whitelist domain (nhất quán quyết định trên — user tự chịu trách nhiệm tool họ tự khai).
- Truncate response về ~8000 ký tự trước khi đưa cho model (tránh nuốt hết context window 1 lần
  gọi tool).
- Chỉ hỗ trợ response JSON hoặc text (decode UTF-8). Response khác (binary, ảnh...) trả lỗi rõ cho
  model biết, không cố xử lý.

**Ngoài phạm vi quyết định này**: ghi `ToolCall` (bảng `tool_calls`) khi `http` tool được gọi —
nhất quán với gap đã ghi nhận riêng ở roadmap (orchestrator gọi sub-agent cũng chưa persist
`tool_calls`, chỉ có SSE event `tool_call_start`/`tool_call_end` lúc đang chạy).

## Consequences

- ✅ Thêm implementation cho 1 kind (vd MCP client thật sau này) = viết/sửa 1 class + đăng ký trong
  registry, không sửa `chat/graph.py` hay đụng code của kind khác.
- ✅ `kind=http` dùng được thật ngay — user khai qua UI form (mockup
  `docs/mockups/agent-tool-execution.html`), không phải gõ JSON Schema tay, model chỉ thấy đúng
  tham số cần điền, không thấy giá trị tĩnh/secret.
- ✅ `kind=mcp` chưa implement không làm crash graph — registry bỏ qua + log warning, agent vẫn
  chat bình thường với các tool khác.
- ⚠️ Secret `http` tool lưu plaintext trong `tools.config` — chấp nhận cho use-case 1 người dùng ở
  giai đoạn này (tương đương mức bảo vệ "ai đọc được DB thì đọc được secret", không kém an toàn hơn
  hiện trạng `Tool.config` JSON tự do vốn đã plaintext). Nếu sau cần mã hoá at-rest, đó là ADR riêng
  tái xét việc tái dùng module `credential` — không âm thầm nâng cấp ngầm ở đây.
- ⚠️ Không có approval gate/domain whitelist cho `http` tool — rủi ro gọi nhầm/gọi tool độc hại nếu
  user tự khai tool từ nguồn không tin cậy. Chấp nhận vì Ultron 1 người dùng, tool do chính user
  khai báo (khác nhận input từ bên thứ ba); nếu sau có nhu cầu chia sẻ tool giữa nhiều user/nguồn
  không tin cậy, cần ADR riêng bổ sung approval gate — không tự thêm bây giờ khi chưa có nhu cầu
  thật.
- ⚠️ `ToolCall` chưa được persist khi gọi `http` tool — cùng gap với sub-agent delegation, để giải
  quyết chung 1 lần ở ADR/feature riêng khi có nhu cầu audit/observability rõ hơn, tránh giải 2 lần
  cho 2 luồng khác nhau.

## Alternatives considered

- **Giữ if/elif chung xử lý `config: dict` tự do theo kind**: loại — đây chính là hướng user đã bác
  (đề xuất "1 ô JSON tay"), né tránh thiết kế thay vì giải quyết; 3 kind bản chất khác hẳn nhau
  (code có sẵn / protocol client / user-defined endpoint), ép chung 1 nhánh if khiến logic của 1
  kind rò sang ảnh hưởng kind khác khi sửa.
- **Plugin registry động (entry points, tự động discover class trong 1 folder theo `kind`)**: loại
  — thừa cho 3 kind cố định biết trước, thêm phức tạp không cần thiết (giống lý luận ADR-0012),
  trong khi lợi ích chính (thêm kind mới không sửa code cũ) đã đạt được đủ với 1 dict tĩnh + đăng ký
  1 dòng.
- **Tái dùng module `credential` (ADR-0010) để lưu secret của `kind=http`**: loại ở bước này —
  `credential` hiện thiết kế cho **provider** (unique theo `provider`, gắn với `build_chat_model`),
  không phải cho secret tuỳ ý theo từng `Tool` row do user tự khai (số lượng secret theo tool có thể
  nhiều, không unique theo 1 trục cố định như provider). Mở rộng `credential` để tổng quát hoá cho
  cả 2 use-case là 1 quyết định kiến trúc riêng (đổi schema `Credential`, thêm liên kết
  `Tool → Credential`), không phải chi tiết implementation của ADR này — làm đơn giản trước
  (plaintext trong `tools.config`, đã plaintext từ ADR-0007), quay lại quyết định này nếu nhu cầu
  mã hoá at-rest cho secret của `http` tool trở nên rõ ràng.
- **Approval gate cho `http` tool (áp lại pattern ADR-0005)**: loại — ADR-0005 nhằm vào tool chạy
  lệnh trên máy (rủi ro thực thi code cục bộ), khác hẳn rủi ro gọi 1 HTTP endpoint user tự khai;
  Ultron 1 người dùng nên không cần duyệt lại hành động của chính user (AGENTS.md rule 6).
