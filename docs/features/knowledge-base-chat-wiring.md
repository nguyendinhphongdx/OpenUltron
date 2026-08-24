# Feature: Wire KnowledgeBase vào chat execution (RAG tool tự động)

Status: accepted

## Vấn đề / động lực

`KnowledgeBase` đã có CRUD + chunking + search (cosine distance qua pgvector) + gán cho agent qua
`AgentKnowledgeBase` (`POST /agents/{id}/knowledge-bases`) — nhưng lúc chat, agent không có cách
nào tự tra KB đã gán: `AgentKnowledgeBase` chỉ là data, chưa map sang tool thật nào trong
LangGraph. Đây là mục còn thiếu rõ nhất trong "Đang làm/tiếp theo" của roadmap.

## Mục tiêu (Goals)

- Agent (top-level hoặc sub-agent, đa tầng) có N `KnowledgeBase` đã gán → tự động có N tool
  "search-knowledge-base" tương ứng trong graph, KHÔNG cần user tự tạo `Tool` row hay config gì
  thêm — điều kiện kích hoạt DUY NHẤT là đã gán KB cho agent (đã có UI/API từ trước).
- Mỗi tool: input `query: str`, gọi `KnowledgeBaseService.search(kb_id, query, top_k)` (đã có
  sẵn, không viết lại logic search), trả nội dung top chunk dạng text cho model đọc.
- Áp dụng cho chat text (`ChatService.send`/`approve`) — nơi đang thiếu, đúng scope roadmap.

## Ngoài phạm vi (Non-goals)

- KHÔNG áp dụng cho voice module (ADR-0009) trong bản này — voice hiện chỉ khai tool delegate
  sub-agent (`_tool_declarations`), chưa khai tool trực tiếp (`tool_specs`) hay KB; mở rộng đó là
  việc riêng, không lẫn vào đây (giữ scope rõ, tránh đổi 2 thứ trong 1 lần).
- KHÔNG cho user tự chỉnh `top_k`/threshold qua UI — dùng 1 hằng số mặc định hợp lý (`top_k=3`),
  đủ cho use-case hiện tại; tinh chỉnh sau nếu có nhu cầu thật.
- KHÔNG đi qua `Tool`/`ToolBuilder` registry (ADR-0013, `kind: builtin|mcp|http`) — KB gán qua
  quan hệ riêng (`AgentKnowledgeBase`), không phải `Tool` row do user tạo; xử lý trực tiếp trong
  `chat/graph.py`, cùng cách `_build_sub_agent_tool` đã xử lý tool "delegate sub-agent" (cũng
  không đi qua registry đó).
- KHÔNG đổi ranking/re-rank kết quả search — dùng nguyên cosine distance đã có.

## Thiết kế

**Refactor đi kèm (không phải feature riêng)**: `ChatService.resolve_context()` hiện trả 1 tuple
trần 4 phần tử — đây CHÍNH LÀ nguyên nhân bug thật vừa fix ở voice module (unpack sai số lượng khi
thêm phần tử thứ 4, lỗi âm thầm vì không có gì báo lúc build/lint). Thêm phần tử thứ 5
(`knowledge_bases`) là đúng lúc đổi sang 1 dataclass `ChatContext` (field có tên, không thể unpack
sai số lượng mà không lỗi ngay tại chỗ gọi) — sửa cả 3 call site (`send`, `approve`,
`voice/service.py`).

`app/modules/chat/graph.py`:
```python
@dataclass
class KnowledgeBaseSpec:
    id: int
    slug: str
    name: str
    description: str | None
```
- `SubAgentSpec` thêm field `knowledge_bases: list[KnowledgeBaseSpec] = field(default_factory=list)`.
- `_build_kb_search_tool(kb: KnowledgeBaseSpec, *, session: AsyncSession) -> BaseTool` — tool
  `search-knowledge-base-{kb.slug}`, description nêu rõ tên/mô tả KB (giúp model biết khi nào nên
  gọi tool nào nếu agent có nhiều KB), coroutine gọi `KnowledgeBaseService.search(kb.id, query,
  top_k=3)` (build service inline từ `session`, cùng pattern `_github_token`/`get_provider_api_key`
  — lazy import tránh vòng import), trả nội dung các chunk nối lại (không phải object JSON thô).
- `run_sub_agent`/`build_agent_executor` nhận thêm KB tool vào `all_tools`/`own_tools`, tương tự
  cách sub-agent-tool được thêm vào hiện tại.

`app/modules/chat/service.py`:
- `resolve_context` trả `ChatContext` (dataclass, không phải tuple) — fetch thêm
  `kb_service.list_for_agent(agent.id)` cho top-level, `_resolve_sub_agent_spec` fetch tương tự
  cho từng sub-agent.
- `ChatService.__init__` nhận thêm `kb_service: KnowledgeBaseService` — cập nhật
  `chat/deps.py::get_chat_service`.

`app/modules/voice/service.py`: cập nhật câu gọi `resolve_context()` sang đọc field từ
`ChatContext` (không unpack tuple nữa) — **không** wire KB vào voice (Non-goal), chỉ đổi cách đọc
kết quả cho khớp API mới.

## Câu hỏi mở

- Không có — feature đã nằm sẵn trong roadmap ("Wire KnowledgeBase vào chat execution"), thiết kế
  tái dùng nguyên pattern `_build_sub_agent_tool` đã có, không có quyết định kiến trúc mới cần hỏi.

## Acceptance criteria

- [ ] Gán 1 `KnowledgeBase` có sẵn chunk cho 1 agent (API cũ, đã có) → chat với agent đó, hỏi 1 câu
      liên quan tới nội dung đã embed → model tự gọi tool `search-knowledge-base-{slug}`, trả lời
      dựa trên chunk tìm được (verify qua `tool_call_start`/`tool_call_end` event + nội dung trả
      lời phản ánh đúng chunk).
- [ ] Agent chưa gán KB nào → không có tool KB nào xuất hiện, chat vẫn hoạt động bình thường
      (không lỗi, không tool rỗng gây confuse model).
- [ ] `resolve_context` đổi sang `ChatContext` không phá vỡ test cũ (`test_chat_service.py`) và
      voice (`test_voice_service.py`) sau khi cập nhật call site.
