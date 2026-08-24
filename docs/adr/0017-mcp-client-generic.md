# ADR-0017 — MCP client generic: dùng SDK chính thức `mcp`, auto-discover schema, gate theo `kind`

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-24

## Context

`Tool.kind=mcp` đã tồn tại trong schema từ [ADR-0013](0013-tool-execution-builder-registry.md)
(`ToolBuilder` registry theo `kind`) nhưng `McpToolBuilder.build()` luôn trả `None` — chưa
implement, roadmap ghi rõ "cần research protocol MCP trước khi spec". Đây là kind cuối cùng trong
3 kind cố định (`builtin`, `mcp`, `http`) chưa có implementation thật; `builtin` đã có GitHub
search/read ([ADR-0015](0015-connector-adapter-abstraction.md)) và file/exec sandbox
([ADR-0016](0016-sandboxed-workspace-file-exec.md)), `http` đã xong từ ADR-0013.

Đã research + verify THẬT (không chỉ đọc doc — Model Context Protocol spec vừa rewrite lớn
2026-07-28, blog/doc có thể lỗi thời): cài `mcp==2.0.0` (SDK Python chính thức,
[github.com/modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk))
và viết 1 demo server (1 tool `add(a,b)` qua `mcp.server.MCPServer` + decorator `@mcp.tool()`) +
1 demo client tự viết, chạy thật qua stdio transport. Xác nhận API thật khác với suy đoán ban đầu:

- `Client(server)` nhận 1 `Transport` (async context manager yield read/write stream), **KHÔNG**
  nhận trực tiếp `StdioServerParameters` — phải wrap qua `stdio_client(...)` trước. Thiếu bước này
  lỗi `TypeError: object does not support async context manager` (tự gặp lúc verify).
- Streamable HTTP thì ngược lại: `Client(url)` nhận thẳng URL string, không cần wrap transport.
- `list_tools()` trả tool có field `input_schema` (snake_case, SDK tự convert từ `inputSchema` của
  wire protocol) — là JSON Schema dict chuẩn, verify đúng
  `{"type":"object","properties":{"a":{"type":"integer"},"b":{"type":"integer"}},"required":["a","b"]}`
  cho demo tool `add`.
- `call_tool(name, args_dict)` trả `.content`, `.structured_content` (dict hoặc `None`),
  `.is_error` — verify `call_tool("add", {"a":3,"b":4})` → `structured_content={"result": 7}` đúng.

Spec đầy đủ (Goals/Non-goals, acceptance criteria) đã chốt ở
[docs/features/mcp-client-generic.md](../features/mcp-client-generic.md) (status: accepted); ADR
này chỉ formalize phần quyết định kiến trúc — thêm dependency mới + tích hợp vào `ToolBuilder`
registry (ADR-0013) và approval gate (ADR-0014).

## Decision

**Thêm dependency mới `mcp`** (`uv add mcp` trong `apps/api`) — SDK Python chính thức của Model
Context Protocol, **không tự viết JSON-RPC client tay**. Version pin theo
`pyproject.toml`/`uv.lock` tại thời điểm thêm (không hardcode version cụ thể ở đây, sẽ lỗi thời).

**Schema `Tool.config` khi `kind=mcp`** (`app/modules/tool/schemas.py`), discriminated union theo
transport:

```python
class McpStdioServerConfig(BaseModel):
    transport: Literal["stdio"] = "stdio"
    command: str
    args: list[str] = []

class McpHttpServerConfig(BaseModel):
    transport: Literal["http"] = "http"
    url: str

class McpToolConfig(BaseModel):
    server: McpStdioServerConfig | McpHttpServerConfig = Field(discriminator="transport")
    remote_tool_name: str
```

Giữ nguyên model **1 `Tool` row Ultron = 1 tool cụ thể trên 1 MCP server cụ thể** (`ToolSpec`,
ADR-0013) — không đổi shape đã có, chỉ thêm 1 kind mới dùng đúng model đó. `remote_tool_name` là
tên tool trên MCP server cần bind vào `Tool` row này.

**`McpToolBuilder.build()` tự động discover args schema qua `list_tools()`** — khác `HttpToolBuilder`
(ADR-0013) bắt user tự khai lại "danh sách tham số AI điền", MCP tool **không** bắt user khai lại
`ai_params`. Lý do: MCP server đã tự expose JSON Schema chuẩn cho từng tool qua protocol, tận dụng
luôn tốt hơn bắt gõ tay lại (dễ sai/lệch khi server đổi schema mà user quên sửa `Tool.config`; HTTP
tool phải bắt khai tay vì REST API thường không tự chuẩn hoá schema, MCP thì có sẵn theo spec). Map
JSON Schema type (`string`/`integer`/`number`/`boolean`/`array`/`object`) sang Python type qua
`pydantic.create_model` — cùng cách `HttpToolBuilder` đã dùng để dựng `args_schema` runtime
(ADR-0013). Property không nằm trong `required` → optional, default `None`.

**Không giữ session/connection xuyên nhiều lần gọi hoặc xuyên turn** — mỗi lần cần `list_tools()`
(lúc build, để lấy schema) hoặc `call_tool()` (lúc agent gọi tool) đều connect mới, đóng ngay sau
khi xong (`async with Client(...) as client:`). Cùng tinh thần `HttpToolBuilder` mở
`httpx.AsyncClient` mới mỗi lần gọi (ADR-0013) — đổi lấy đơn giản (không quản lý lifecycle session
dài hạn, không lo leak) bằng thêm latency (connect lại mỗi lần; với stdio nghĩa là spawn subprocess
mới mỗi lần).

**Approval gate áp theo `kind`, không theo `slug` cố định** — sửa
`app/modules/chat/graph.py::_human_in_the_loop_middleware`: điều kiện gate mở rộng thành
`t.slug in TOOLS_REQUIRING_APPROVAL or t.kind == "mcp"`. Khác builtin tool
(`TOOLS_REQUIRING_APPROVAL`, [ADR-0014](0014-tool-approval-gate.md), là 1 danh sách slug CỐ ĐỊNH
biết trước vì builtin tool là code Ultron tự viết), `kind=mcp` là do user tự khai `Tool` row với
slug tuỳ ý — không thể liệt kê trước. **Mọi tool `kind=mcp` đều bắt buộc qua approval, không có
ngoại lệ**, vì Ultron không biết trước MCP server đó (process/dịch vụ do user tự khai) làm gì.

## Consequences

- ✅ `kind=mcp` dùng được thật — hoàn thành đủ 3 kind trong `ToolBuilder` registry (ADR-0013),
  không còn kind nào trả `None`/log warning bỏ qua.
- ✅ Dùng SDK chính thức đã verify thật (không tự viết JSON-RPC/transport layer) — giảm bug tự tạo
  ra, đúng protocol MCP thật (đã spawn demo server/client chạy thật, không chỉ đọc doc).
- ✅ User không phải khai tay `args_schema` cho mỗi MCP tool — tận dụng đúng cơ chế discovery mà
  MCP protocol đã thiết kế sẵn.
- ⚠️ Connect mới mỗi lần gọi (không pool/cache session) — thêm latency, với stdio là chi phí spawn
  subprocess mỗi lần gọi tool. Chấp nhận cho use-case cá nhân hiện tại (không đo được vấn đề thật);
  tối ưu bằng session pool là quyết định riêng nếu latency thực sự gây khó chịu, đo được cụ thể.
- ⚠️ Mọi tool `kind=mcp` đều bắt buộc approval, không có cách nào user tự đánh dấu "MCP server này
  tôi tin tưởng, không cần duyệt mỗi lần" — chấp nhận vì mặc định an toàn quan trọng hơn tiện lợi ở
  bản đầu; nếu về sau thấy gate mọi lần quá phiền cho MCP server đã tin tưởng lâu dài, đó là ADR
  riêng cân nhắc cơ chế allowlist theo server, không tự thêm ngầm ở đây.
- ⚠️ `McpToolConfig` chỉ hỗ trợ stdio + streamable HTTP — không cover các transport khác MCP SDK có
  thể hỗ trợ (nếu có). Đủ cho 2 use-case phổ biến nhất hiện tại (local process, remote HTTP server);
  mở rộng thêm transport là sửa union `McpStdioServerConfig | McpHttpServerConfig`, không đổi
  interface `ToolBuilder`.

## Alternatives considered

- **Bắt user tự khai `ai_params` như `kind=http`** (không tận dụng `list_tools()`): loại — MCP
  server đã tự chuẩn hoá schema qua protocol, bắt gõ tay lại là làm lại việc đã có sẵn, dễ lệch khi
  server đổi schema mà user quên sửa `Tool.config`.
- **Giữ 1 session MCP xuyên turn/pool theo server** (để giảm latency connect lại mỗi lần): loại ở
  bản đầu — thêm độ phức tạp lifecycle (khi nào đóng session, xử lý stdio subprocess chết giữa
  chừng, dùng chung session giữa nhiều turn/conversation) không cần thiết cho use-case cá nhân
  hiện tại; có thể tối ưu sau bằng ADR riêng nếu latency thực sự là vấn đề, đo được không đoán.
- **Gate approval theo slug tĩnh như builtin tool** (thêm field config riêng để user tự đánh dấu 1
  `Tool` row `kind=mcp` "cần duyệt" hay không): loại — slug do user tự đặt tuỳ ý, không có gì đảm
  bảo user luôn đánh dấu đúng; mặc định AN TOÀN hơn là mọi `kind=mcp` đều gate, không dựa vào user
  tự nhớ đánh dấu.
- **Tự viết JSON-RPC client tay theo MCP spec** (không dùng SDK chính thức): loại — SDK
  `modelcontextprotocol/python-sdk` đã là implementation chính thức, tự viết lại là tốn công + rủi
  ro lệch spec (đặc biệt sau spec rewrite lớn 2026-07-28) không cần thiết.
