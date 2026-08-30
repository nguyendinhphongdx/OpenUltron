# ADR-0020 — `AgentRuntime` interface: tách LangGraph khỏi `ChatService`

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-30

## Context

`apps/api/app/modules/chat/service.py::ChatService` hiện gọi thẳng API riêng của LangGraph, không
qua interface trung gian nào (xác nhận bằng đọc code thật,
[`docs/features/agent-runtime-abstraction.md`](../features/agent-runtime-abstraction.md)):
`executor.astream_events(..., version="v2")`, `executor.aget_state()`,
`langgraph.types.Command(resume=...)`, và `graph.py::build_agent_executor` trả thẳng
`CompiledStateGraph` (type của LangGraph) cho `ChatService` giữ xuyên suốt `send()`/`approve()`.
Đổi framework khác (hoặc chỉ đổi cách LangGraph đổi shape API ở version sau) phải sửa trực tiếp
`ChatService`.

Ngoài ra, code hiện có **2 cách khác nhau để "chạy 1 agent"**, không qua interface chung: (1)
`build_agent_executor` — dùng bởi `ChatService.send()`/`approve()`, có checkpointer +
`HumanInTheLoopMiddleware` (ADR-0014), chạy qua `astream_events`/`aget_state` (streaming, pause
được); (2) `run_sub_agent` — dùng bởi tool "gọi sub-agent" (`_build_sub_agent_tool`) VÀ
`voice/service.py::VoiceService.handle_tool_call` khi Gemini Live yêu cầu delegate — tự
`create_agent(...)` KHÔNG checkpointer/middleware, chạy qua `ainvoke` (đồng bộ, không pause được) —
chủ đích (nested interrupt phức tạp hơn hẳn, ngoài phạm vi ADR-0014), nhưng vẫn là 2 lần viết tay
logic "build agent rồi chạy nó".

## Decision

Thêm 1 `Protocol` `AgentRuntime` ở **`app/core/agent_runtime.py`** (không đặt trong
`app/modules/chat/`) — vì `voice/service.py` cũng cần gọi, và
[`01-backend-fastapi.md`](../conventions/01-backend-fastapi.md) rule "service không import
service/repository của module khác" cần 1 vị trí trung lập; `app/core/` đã là tiền lệ cho thứ
dùng chung nhiều module (`core/providers.py`, `core/provider_adapter.py`).

```python
class AgentRuntime(Protocol):
    async def run_streaming(self, ...) -> AsyncIterator[dict]: ...  # có checkpoint + approval gate
    async def run_sync(self, ...) -> str: ...                        # không checkpoint/approval, dùng cho sub-agent/voice delegate
```

- **2 method riêng, không ép chung 1 shape** — `run_streaming` (turn top-level, streaming +
  checkpoint + `HumanInTheLoopMiddleware`, dùng bởi `ChatService.send`/`approve`) và `run_sync`
  (turn sub-agent lồng, `ainvoke` đồng bộ không pause được, dùng bởi tool delegate + voice
  tool-call) là 2 use case khác bản chất — ép vào 1 method là đúng anti-pattern ADR-0013 đã từng
  bác bỏ (nhồi nhiều case khác nhau vào 1 shape "linh hoạt").
- **Chỉ 1 implementation — `LangGraphAgentRuntime`** implement cả 2 method (nội dung chính là
  `build_agent_executor`/`run_sub_agent`/`_run_turn` hiện có, di chuyển vào implementation này,
  giữ nguyên logic). **KHÔNG dựng `dict` registry** — đúng ngưỡng convention "Modular/swappable
  component" ([01-backend-fastapi.md](../conventions/01-backend-fastapi.md)): chỉ trừu tượng hoá
  bằng registry khi có ≥2 cài đặt thật. Thêm registry khi có framework thứ 2 thật cần dùng, không
  phải bây giờ.
- **Event shape nội bộ giữ nguyên** (`delta`/`tool_call_start`/`tool_call_end`/`approval_required`/
  `done`/`error`) — đây là internal contract của `run_streaming`, khác AG-UI (ADR-0019, đã là boundary
  ngoài, không đổi). `ChatService.send_agui()` vẫn map internal event → AG-UI event như hiện tại,
  chỉ nguồn sinh event đổi từ gọi thẳng LangGraph sang gọi qua `AgentRuntime.run_streaming`.
- `ChatService.send()`/`approve()` đổi sang gọi `self.runtime.run_streaming(...)`/implicit resume
  thay vì tự `build_agent_executor` + `astream_events`/`aget_state`/`Command`. `graph.py::
  _build_sub_agent_tool` đổi sang gọi `self.runtime.run_sync(...)` (hoặc runtime truyền vào) thay
  vì tự gọi `run_sub_agent()` cũ.
- **Không tự động unify voice top-level turn** — `VoiceService` (Gemini Live làm turn chính,
  ADR-0009/0018) tiếp tục KHÔNG đi qua `AgentRuntime` cho turn chính của nó trong ADR này; chỉ phần
  `handle_tool_call` (delegate sang sub-agent) đổi sang gọi `AgentRuntime.run_sync` thay vì
  `run_sub_agent()` trực tiếp. Quyết định "voice top-level turn có nên đi qua LangGraph/
  `AgentRuntime` hay tiếp tục để Gemini Live làm turn chính" là 1 ADR riêng sau (epic "Voice là
  input modality của agent thường", roadmap).

## Consequences

- ✅ `ChatService` không còn biết `CompiledStateGraph`/`astream_events`/`Command` — đổi framework
  agent execution (nếu cần) chỉ sửa `LangGraphAgentRuntime`, không lan ra `ChatService`/`router.py`.
- ✅ Duplication "build agent rồi chạy nó" (2 chỗ viết tay) gom về 1 implementation, 2 method rõ
  ràng theo đúng bản chất khác nhau của chúng (không giả vờ chúng giống nhau).
- ✅ Bước nền tảng cho epic "Hợp nhất Voice Agent" (roadmap) — khi cần quyết voice top-level turn,
  interface đã sẵn sàng để voice gọi qua, không phải thiết kế lại từ đầu.
- ⚠️ Thêm 1 tầng gián tiếp (interface + 1 implementation) — chấp nhận được vì giải quyết đau thật
  (LangGraph leak + duplication), không phải trừu tượng hoá phòng hờ.
- ⚠️ Chưa giải quyết unify voice top-level turn — vẫn còn 2 "cách chạy agent chính" ở tầng cao nhất
  (LangGraph cho text, Gemini Live cho voice) cho tới khi có ADR riêng.

## Alternatives considered

- **Giữ nguyên, không tách interface**: loại vì đã có duplication thật (không chỉ rủi ro tương
  lai) và LangGraph API đổi version (`astream_events` v2, interrupt payload shape) từng gây bug
  thật đã note trong code — sửa lặp lại ở nhiều chỗ khi API đổi.
- **Dựng `dict` registry ngay** (giống `ProviderAdapter`/`ToolBuilder`): loại vì chỉ có 1
  implementation thật — đúng convention, KHÔNG trừu tượng hoá cho tương lai chưa tới.
- **Ép `run_streaming`/`run_sync` thành 1 method chung** (flag `streaming: bool`): loại vì 2 use
  case khác bản chất (có/không checkpoint, có/không approval, sync/async iterator) — đúng
  anti-pattern "1 method nhận flag để chọn nhánh" mà [01-backend-fastapi.md](../conventions/01-backend-fastapi.md)
  đã cấm.
- **Unify luôn voice top-level turn trong ADR này**: loại vì đây là quyết định kiến trúc lớn hơn
  hẳn (đổi cách Live Voice hoạt động, ngược lại ADR-0009/0018 hiện tại) — cần research/spec riêng,
  không nhét vào 1 ADR về interface đơn thuần.
