# Research: Wire Tool vào chat execution — kind builtin/mcp/http

Liên quan spec: `docs/features/agent-tool-execution.md`

## Câu hỏi nghiên cứu

`Tool` (ADR-0007) có field `kind: builtin | mcp | http` + `config: dict` tự do, nhưng chưa có bất kỳ
implementation nào build ra 1 LangGraph tool thật để `create_agent` gọi. User bác đề xuất "chỉ làm
form JSON tay cho config" — 3 kind có bản chất khác hẳn nhau (builtin = code Python cố định trong
repo, mcp = protocol client gọi server ngoài, http = user tự khai báo endpoint bất kỳ qua UI, không
code). Câu hỏi cần trả lời trước khi viết Goals/Non-goals:

1. Sản phẩm khác cho user "tự khai 1 tool gọi HTTP" mà LLM gọi được thiết kế UI/data shape thế nào —
   field gì, không phải JSON tay?
2. Cách họ phân biệt tool "code có sẵn" (builtin) vs "tool ngoài" (MCP/plugin) vs "tool user tự khai"
   (HTTP) có pattern chung nào áp dụng được cho Ultron không?
3. Cách map các field UI đó sang "args schema" mà OpenAI/LangChain tool cần (để model biết tham số
   nào phải điền, type gì) — có cần user tự viết JSON Schema tay không, hay có cách né được?

## Sản phẩm/tài liệu tham khảo

- **n8n** — HTTP Request node gắn vào AI Agent làm tool + hàm `$fromAI()`
  ([Let AI specify tool parameters](https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/),
  [Use AI for parameters](https://docs.n8n.io/build/integrate-ai/ai-examples/use-ai-for-parameters),
  [HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest)):
  user cấu hình 1 HTTP request bình thường (method/URL/headers/query/body qua form name-value hoặc
  JSON) như mọi node khác, không viết JSON Schema riêng. Với field nào muốn model tự điền, user gõ
  `$fromAI(key, description, type)` ngay trong ô giá trị đó (URL, header value, query value, body) —
  `key` là tên param, `description` bằng tiếng tự nhiên giải thích cho model, `type` một trong
  `string|number|boolean|json` (mặc định `string`). n8n tự dò các lời gọi `$fromAI()` trong node để
  suy ra tool schema (tên/description/type từng tham số) đưa cho LLM — user không tự viết JSON
  Schema.
- **OpenAI function calling** ([docs chính thức](https://developers.openai.com/api/docs/guides/function-calling)):
  chuẩn "đích" mà mọi tool phải map tới — 1 tool = `{name, description, parameters}` với `parameters`
  là JSON Schema (type/required/enum/description từng field). Đây không phải sản phẩm có UI, mà là
  format LLM cần thấy — LangChain (`args_schema` từ Pydantic model, dùng trong `chat/graph.py`) sinh
  ra đúng shape này. Không sản phẩm nào bên trên yêu cầu user viết JSON Schema tay — họ đều có 1 lớp
  trung gian sinh JSON Schema từ input UI-friendly hơn (n8n: cú pháp `$fromAI` embed trong field;
  Composio: Pydantic/Zod model viết bằng code).
- **Composio** ([Custom Tools](https://docs.composio.dev/docs/custom-tools),
  [Tools and toolkits](https://docs.composio.dev/tool-calling/custom-tools)): "custom tool" ở đây
  nghĩa là *viết code* — tham số đầu vào của hàm là 1 Pydantic model (Python) / Zod schema
  (TypeScript), field description trở thành mô tả mà agent thấy, docstring hàm trở thành tool
  description. Với tool thuộc 1 "toolkit" có sẵn (đã tích hợp OAuth), gọi HTTP qua
  `ctx.proxy_execute(toolkit, endpoint, method, body)` — auth được toolkit tự inject, **không có UI
  no-code để tự khai 1 endpoint tuỳ ý** như yêu cầu của Ultron. Đây là ví dụ đối lập hữu ích: Composio
  không giải bài toán "user tự khai HTTP endpoint qua UI, không viết code" — chỉ giải bài toán
  "developer viết tool bằng code, hoặc dùng tool đã có sẵn trong catalog toolkit".

## So sánh

| Khía cạnh | n8n (HTTP tool) | OpenAI function calling (chuẩn đích) | Composio custom tool | Đề xuất cho Ultron |
|---|---|---|---|---|
| User tự khai tool qua UI, không code | Có — form HTTP thường + `$fromAI()` inline | N/A (không phải sản phẩm UI) | Không — luôn phải viết code (Pydantic/Zod) | Cần có, đúng yêu cầu ban đầu (kind=http) |
| Cách đánh dấu "field này để LLM điền" | Cú pháp `$fromAI(key, description, type)` ngay trong giá trị field | Không áp dụng (chỉ định nghĩa `parameters` JSON Schema thẳng) | Field Pydantic model = tham số agent thấy | Tương tự n8n: đừng bắt user viết JSON Schema tay, cho 1 UI khai "tham số AI điền" (tên/mô tả/type) rồi tham chiếu bằng placeholder trong URL/header/body |
| Auth cho endpoint ngoài | User tự điền API key vào header (giá trị tĩnh), hoặc dùng n8n credential riêng | N/A | Toolkit tự inject qua session auth (OAuth quản lý bởi Composio) | Ultron 1 user: cho user tự dán secret tĩnh vào 1 header value — câu hỏi mở là lưu ở đâu (plaintext `config` JSON hiện tại, hay tái dùng module `credential` ADR-0010) |
| Phân loại tool theo nguồn | Không phân loại rõ builtin/mcp/http — mọi node đều là "node", AI tool chỉ là 1 chế độ gắn thêm | N/A | Có (`toolkit`-based vs "standalone") nhưng cả 2 đều là code, không có kind "user khai qua UI" riêng | Giữ 3 kind hiện có (đã tồn tại từ ADR-0007) nhưng build khác nhau hoàn toàn — cần 1 "tool builder" theo kind, không 1 hàm build chung cho cả 3 |

## Insight áp dụng cho Ultron

- **Đích cuối luôn giống nhau bất kể kind**: LangGraph/LangChain cần 1 callable + `name` +
  `description` + `args_schema` (Pydantic model, LangChain tự convert sang JSON Schema khi đưa cho
  model — đúng format OpenAI function calling). Vì đích giống nhau nhưng cách tạo ra nó khác hẳn theo
  kind → đúng dạng bài "1 interface, nhiều implementation" đã có tiền lệ trong repo:
  `ProviderAdapter` (ADR-0012, `app/core/provider_adapter.py`) — 1 `Protocol` build theo
  `provider`, registry dict tĩnh (không plugin discovery động, ADR-0012 đã cân nhắc và loại vì thừa
  cho số lượng kind cố định biết trước — tình huống tool kind cũng chỉ có 3 giá trị cố định, tương
  tự). `solution-architect` có thể tham khảo style này khi thiết kế "ToolBuilder theo kind", không
  bắt buộc giống 100% nhưng nên biết precedent.
- **Né JSON Schema tay bằng cách học pattern n8n `$fromAI`**: cho user khai UI form HTTP bình thường
  (method/URL/headers/query/body qua field name-value, không phải 1 ô JSON tự do) + 1 danh sách
  riêng "tham số AI điền" (tên, mô tả, type: string/number/boolean/json) → tham chiếu tham số đó
  bằng placeholder (`{{param_name}}`) trong URL/header value/query value/body. Ultron backend suy ra
  `args_schema` (Pydantic model dựng runtime) từ chính danh sách "tham số AI điền" này — không cần
  user tự viết JSON Schema, đúng tinh thần user yêu cầu ("không chỉ form JSON tay").
- **Auth**: không sản phẩm nào trong 3 cái trên bắt user viết JSON tay cho phần auth — đều có ô
  riêng (header/API key). Ultron có sẵn module `credential` (ADR-0010, AES-256-GCM) cho provider
  model — có thể tái dùng khái niệm này cho "secret của 1 http tool" thay vì lưu plaintext trong
  `tools.config` JSONB hiện tại, nhưng đây là quyết định kiến trúc thật (đổi field/thêm bảng) —
  để `solution-architect`/ADR quyết, không tự chọn ở đây.
- **`kind=builtin` không cần UI đặc biệt** — theo đúng bản chất "code Python cố định trong repo",
  hướng tự nhiên là 1 registry tĩnh (`slug → callable`) giống `PROVIDERS` dict của ADR-0012, không
  cần form nào cho user tự "tạo" builtin tool (chỉ tạo `Tool` row metadata trỏ tới 1 slug đã có
  trong registry code) — không sản phẩm nào research thêm insight mới ở nhánh này, quyết định chủ
  yếu dựa trên tiền lệ nội bộ đã có (`ProviderAdapter`).

## Không áp dụng / ngoài phạm vi

- **n8n workflow/canvas rộng hơn (multi-node, trigger, branching)** — chỉ tham khảo đúng 1 node/tính
  năng (`$fromAI` trong HTTP Request tool), không áp dụng mô hình workflow engine tổng thể vào
  Ultron.
- **Composio OAuth-managed toolkit ecosystem** (auth broker cho hàng trăm SaaS tích hợp sẵn,
  `AuthConfig` theo tenant) — Ultron 1 người dùng (AGENTS.md rule 6), không cần managed multi-tenant
  auth broker; user tự dán 1 secret tĩnh của chính họ, không qua OAuth flow trung gian nào.
- **OpenAI "hosted tools"** (web_search/code_interpreter chạy trong runtime của OpenAI) — không liên
  quan vì Ultron tự thực thi tool qua LangGraph, không dùng runtime hosted tool của bất kỳ provider
  nào (ADR-0001, tự viết toàn bộ).
- **`$fromAI` cho phép AI tự quyết ngay cả method/URL gốc** (n8n cho phép áp `$fromAI` vào bất kỳ ô
  nào kể cả URL) — Ultron có thể cân nhắc giới hạn hẹp hơn ở bản đầu (chỉ query/header/body value
  được templated, URL gốc cố định do user khai) để giảm rủi ro model tự đổi endpoint gọi tới đâu;
  đây là 1 lựa chọn thiết kế cụ thể, để trong "Câu hỏi mở" của spec, không tự quyết ở research.
