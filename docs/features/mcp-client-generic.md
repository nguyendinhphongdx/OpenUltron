# Feature: MCP client generic (`kind=mcp`)

Status: accepted

## Vấn đề / động lực

`Tool.kind=mcp` đã tồn tại trong schema từ ADR-0013 nhưng `McpToolBuilder` luôn trả `None` — chưa
implement, roadmap ghi rõ "cần research protocol MCP riêng trước khi spec". Đã research trực tiếp
(2026-08-24): cài `mcp==2.0.0` (SDK Python chính thức,
[github.com/modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk))
và verify thật bằng 1 demo server + demo client tự viết — xác nhận API thật (không dựa hoàn toàn
vào doc/blog, có thể lỗi thời do spec vừa rewrite lớn 2026-07-28):

- `from mcp import Client, StdioServerParameters` + `from mcp.client.stdio import stdio_client`.
- Stdio: `async with Client(stdio_client(StdioServerParameters(command=..., args=[...]))) as client:`.
- Streamable HTTP: `async with Client(url) as client:` (`url: str`).
- `await client.list_tools()` → `.tools`, mỗi tool có `.name`, `.description`, `.input_schema`
  (JSON Schema dict).
- `await client.call_tool(name, args_dict)` → `.content`, `.structured_content`, `.is_error`.

## Mục tiêu (Goals)

- `Tool.config` khi `kind=mcp` khai: (a) server connection — stdio (`command`+`args`) hoặc HTTP
  (`url`), (b) `remote_tool_name` — tên tool trên MCP server cần bind vào `Tool` row này (1
  `Tool` row Ultron = 1 tool trên 1 MCP server, đúng model `ToolSpec` hiện có — không đổi).
- `McpToolBuilder.build()` tự động discover args schema thật qua `list_tools()` (KHÔNG bắt user
  tự khai lại `ai_params` như `kind=http` — MCP server đã tự khai schema, tận dụng luôn).
- Mỗi lần gọi tool: connect mới, gọi `call_tool`, đóng connection — không giữ session xuyên turn
  (đơn giản, tránh leak; cùng tinh thần `HttpToolBuilder` mở `httpx.AsyncClient` mới mỗi lần).
- **Mọi tool `kind=mcp` bắt buộc qua approval gate (ADR-0014)** — khác GitHub tool (chỉ đọc, biết
  trước hành vi), MCP server là process/dịch vụ do user tự khai tuỳ ý, Ultron không biết trước nó
  làm gì — an toàn hơn là coi mọi tool loại này "chưa biết rủi ro" theo `kind`, không theo từng
  slug cụ thể (khác cách `TOOLS_REQUIRING_APPROVAL` áp cho builtin tool, vì builtin tool áp cho 1
  danh sách fix biết trước, còn `mcp` là slug do user tự đặt tuỳ ý — phải gate theo `kind`).

## Ngoài phạm vi (Non-goals)

- KHÔNG cache/pool session MCP xuyên nhiều lần gọi hoặc xuyên turn — mỗi lần đều connect mới (chấp
  nhận thêm latency, đổi lại đơn giản/an toàn hơn, không phải lo lifecycle đóng session khi nào).
- KHÔNG hỗ trợ MCP resources/prompts (chỉ tools) — Ultron chỉ cần agent gọi được tool, không cần
  đọc resource hay dùng prompt template của MCP server.
- KHÔNG UI riêng để "browse" tool có sẵn trên 1 MCP server trước khi tạo `Tool` — user tự biết tên
  tool cần bind (`remote_tool_name`) khi khai, giống cách `kind=http` user tự biết field API. Nếu
  sau này cần UI "test connection, list tool" cho MCP thì đó là 1 feature nhỏ riêng.
- KHÔNG hỗ trợ auth phức tạp cho HTTP transport (OAuth...) ở bản đầu — chỉ URL trần; nếu server
  cần header auth, chưa hỗ trợ (feature riêng khi có nhu cầu thật).
- KHÔNG sandbox subprocess MCP server (khác `run-command`, ADR-0016) — server MCP do user tự khai
  command, user chịu trách nhiệm command đó an toàn; approval gate mỗi lần gọi là lớp bảo vệ chính
  (biết được arguments cụ thể mỗi lần trước khi chạy).

## Thiết kế

`app/modules/tool/schemas.py` thêm:

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

`app/modules/tool/builder.py::McpToolBuilder.build(spec, session)`:
1. Validate `spec.config` qua `McpToolConfig` — lỗi → log warning, return `None` (cùng pattern
   `HttpToolBuilder`).
2. Connect tới server (stdio hoặc HTTP theo `config.server.transport`), gọi `list_tools()`, tìm
   tool khớp `remote_tool_name` — không thấy → log warning, return `None`.
3. Build `args_schema` (pydantic, qua `create_model`) từ `tool.input_schema` (JSON Schema) của
   tool tìm được — map type JSON Schema (`string`/`integer`/`number`/`boolean`/`array`/`object`)
   sang Python type, lấy `description` từ mỗi property, field không có trong `required` → optional
   (default `None`).
4. Trả `StructuredTool` — coroutine mỗi lần được gọi: connect mới, `call_tool(remote_tool_name,
   kwargs)`, trả `structured_content` (nếu có) hoặc `content` dạng text, truncate 8000 ký tự (cùng
   `_MAX_RESPONSE_CHARS` đã có).

`app/modules/chat/graph.py::_human_in_the_loop_middleware` — thêm điều kiện gate theo `kind`
(không chỉ slug): `t.slug in TOOLS_REQUIRING_APPROVAL or t.kind == "mcp"`.

Dependency mới: `mcp` (Python SDK chính thức, `uv add mcp`) — quyết định kiến trúc, ghi ADR riêng
(xem [docs/adr/0017-mcp-client-generic.md](../adr/0017-mcp-client-generic.md)).

## Câu hỏi mở

- Không có — Goals/Non-goals suy trực tiếp từ roadmap đã chốt trước ("user tự khai MCP server tuỳ
  ý") + kết quả research thật (ground-truth verify bằng demo server/client), không cần hỏi thêm.

## Acceptance criteria

- [ ] Tạo `Tool` với `kind=mcp`, `config` khai 1 server stdio + `remote_tool_name` trỏ đúng 1 tool
      có thật trên server đó → gán cho agent → chat thật yêu cầu agent gọi tool → turn pause chờ
      duyệt (mọi tool `kind=mcp` đều gate, không cần khai slug riêng).
- [ ] Approve → tool chạy thật, agent nhận đúng kết quả từ MCP server (verify bằng demo server tự
      viết, tool `add(a, b)` trả đúng tổng).
- [ ] `args_schema` build từ `input_schema` thật của remote tool — LLM thấy đúng tên/mô tả
      argument (không phải `**kwargs` mù).
- [ ] Config sai (thiếu field, `remote_tool_name` không tồn tại trên server, server không kết nối
      được) → `build()` trả `None`, KHÔNG crash turn, agent vẫn chat được (thiếu đúng 1 tool).
- [ ] Reject → tool không chạy, model biết bị từ chối (cùng hành vi `approval-test-echo` đã verify
      ở ADR-0014).
