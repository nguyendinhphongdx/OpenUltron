# Feature: Agent Runtime Abstraction (`AgentRuntime`/`TurnRunner`)

Status: done (2026-08-30) — xem [ADR-0020](../adr/0020-agent-runtime-interface.md) cho quyết định
kiến trúc cụ thể (đã trả lời hết "Câu hỏi mở" dưới đây). Code xong + verify: 89 test pass (thêm 1
test mới), `ruff`/`check_module_boundaries.py` xanh, app boot được (không circular import).

## Vấn đề / động lực

`apps/api/app/modules/chat/service.py::ChatService` hiện gọi **thẳng** API riêng của LangGraph,
không qua interface/adapter trung gian nào — xác nhận bằng đọc code thật (không suy đoán):

- `service.py::ChatService._run_turn`: `executor.astream_events(input_data, config=config,
  version="v2")` — vòng lặp đọc `event["event"]`/`event["data"]["chunk"]` là shape sự kiện riêng
  của `astream_events` LangGraph.
- `service.py::ChatService._run_turn`: sau khi stream xong, `executor.aget_state(config)` rồi đọc
  `state.tasks[*].interrupts[*].value["action_requests"]` — phụ thuộc đúng cách
  `HumanInTheLoopMiddleware` (ADR-0014) lưu interrupt payload trong LangGraph, không có event tường
  minh nào báo "graph đã pause" (đã note ngay trong code: "KHÔNG có event tường minh cho việc này —
  xác nhận qua research + live-test thật").
- `service.py::ChatService.approve`: `from langgraph.types import Command` — dùng thẳng
  `Command(resume={"decisions": [...]})` để resume graph.
- `graph.py::build_agent_executor` khai kiểu trả về là `CompiledStateGraph` — type của LangGraph —
  và `ChatService` giữ biến `executor` với type đó xuyên suốt `send()`/`approve()`/`_run_turn()`.

Kết quả: muốn đổi/thêm framework agent execution khác (framework khác, hoặc chỉ đổi cách gọi API
của chính LangGraph ở version sau — vd `astream_events` đổi shape, `aget_state`/interrupt payload
đổi cấu trúc) đều phải sửa trực tiếp `ChatService`, nơi lẽ ra chỉ nên biết "chạy 1 turn, nhận về
delta/tool-call/approval/done" chứ không biết chi tiết implementation.

**Duplication đã tồn tại thật, không chỉ là rủi ro tương lai** — đọc `chat/graph.py` cho thấy đã có
**2 cách khác nhau để "chạy 1 agent"** trong cùng codebase, không đi qua bất kỳ interface chung nào:

1. `build_agent_executor()` (dùng bởi `ChatService.send()`/`approve()`) — `create_agent(...,
   checkpointer=get_checkpointer(), middleware=_human_in_the_loop_middleware(tools))`, chạy qua
   `astream_events` + `aget_state`, có checkpoint (Postgres) + approval-gate (ADR-0014).
2. `run_sub_agent()` (dùng bởi tool "gọi sub-agent" trong `graph.py` chính nó, VÀ bởi
   `voice/service.py::VoiceService.handle_tool_call` khi Gemini Live yêu cầu delegate sang
   sub-agent) — tự `create_agent(...)` **không** checkpointer, **không** middleware approval, chạy
   qua `executor.ainvoke(...)` (đồng bộ, không stream) — comment trong code giải thích đây là chủ
   đích ("nested interrupt phức tạp hơn, ngoài phạm vi"), nhưng về mặt kiến trúc đây vẫn là 2 code
   path độc lập cùng làm việc "build 1 agent LangGraph rồi chạy nó với 1 input", viết tay 2 lần,
   không chia sẻ interface.

Thêm vào đó, `voice/service.py::VoiceService.run()` cho thấy rõ **voice hiện KHÔNG chạy top-level
turn qua LangGraph/`ChatService` — nó chạy qua Gemini Live (`get_voice_provider("gemini")`,
ADR-0018) làm model chính**, chỉ gọi vào `run_sub_agent` (LangGraph) khi Gemini yêu cầu delegate
cho 1 sub-agent cụ thể. Nghĩa là hiện có **2 nơi hoàn toàn tách biệt "chạy 1 lượt agent"**: chat
text (LangGraph full — checkpoint/approval/stream) và voice (Gemini Live làm turn chính, LangGraph
chỉ chạy con — không checkpoint/approval/stream ở nhánh đó). Đây chính là "đau thật" roadmap đã ghi
nhận 2 lần ở mục "Đang làm/tiếp theo" (`docs/roadmap/README.md`):

> "P0 — Chuẩn hoá agent runtime + stream contract + chat UI... Cần gom lại thành 1 contract chuẩn
> cho frontend runtime đọc được... Cần spec trước, rồi ADR nếu chọn protocol/runtime chính."
> (phần **frontend/wire contract** của việc này ĐÃ xong —
> [`unified-agent-stream-runtime.md`](unified-agent-stream-runtime.md) Status: done, ADR-0019, đó
> là AG-UI wire protocol phía ngoài, KHÔNG phải interface phía trong backend đang nói ở đây)

> "P0 — Hợp nhất Voice Agent vào agent runtime thường... Cần thiết kế `AgentRuntime`/`TurnRunner`
> dùng chung cho text + voice, rồi để Gemini/OpenAI/self-host realtime provider chỉ là adapter
> modality ở rìa hệ thống."

Bản spec này hiện thực hoá đúng phần `AgentRuntime`/`TurnRunner` mà bullet thứ 2 đã nhắc tên nhưng
chưa ai viết spec cụ thể — tách "chạy 1 turn agent" (LangGraph hiện tại) thành 1 interface riêng mà
`ChatService` (và sau này có thể là phần chạy sub-agent delegation của `VoiceService`) chỉ gọi qua
interface đó, không biết LangGraph là gì.

**Lưu ý ranh giới quan trọng** (đọc kỹ trước khi viết Goals): interface này giải quyết đúng phần
"chạy 1 agent LangGraph, nhận về stream chuẩn hoá" — nó **không tự động** giải quyết toàn bộ epic
"Hợp nhất Voice Agent" (bullet roadmap thứ 2), vì phần khó nhất của epic đó là quyết định **voice
top-level turn có nên đi qua LangGraph/`AgentRuntime` thay vì Gemini Live làm turn chính hay không**
— đó là 1 quyết định kiến trúc lớn hơn hẳn (đổi hẳn cách Live Voice hoạt động, ADR-0009/0018 đang
mô tả kiến trúc ngược lại: Gemini Live là model chính, LangGraph chỉ là "tool"), ngoài phạm vi 1
interface đơn thuần. Xem "Câu hỏi mở" bên dưới để user xác nhận ranh giới.

## Mục tiêu (Goals) — draft, chờ user confirm

- Định nghĩa 1 interface (`AgentRuntime`/`TurnRunner`, tên chính xác để `solution-architect` chốt)
  ở `apps/api` mô tả "chạy 1 turn agent": start turn (input mới) / resume turn (approval
  decision) / stream sự kiện đã chuẩn hoá nội bộ — không phải AG-UI (đã có ADR-0019, ở boundary
  ngoài) mà là internal event shape hiện `ChatService._run_turn` đang tự yield
  (`delta`/`tool_call_start`/`tool_call_end`/`approval_required`/`done`/`error`).
- Interface **không lộ** bất kỳ type/API riêng của LangGraph ra chữ ký public
  (`CompiledStateGraph`, `Command`, `astream_events`/`aget_state` shape) — mọi chi tiết đó nằm
  trong 1 implementation cụ thể (vd `LangGraphAgentRuntime`), `ChatService` chỉ import interface +
  gọi qua nó.
- `ChatService.send()`/`approve()` (và `send_agui()` gián tiếp qua 2 hàm đó) đổi sang gọi qua
  interface thay vì `build_agent_executor()` + `astream_events`/`aget_state`/`Command` trực tiếp
  như hiện tại.
- Giải quyết đúng duplication thật đã chỉ ra ở "Vấn đề": 2 code path `build_agent_executor` (dùng
  bởi `ChatService`) và `run_sub_agent` (dùng bởi tool delegate + `VoiceService`) hiện tự viết 2
  lần logic "build agent rồi chạy nó" — cần rõ ràng interface mới có cover/hợp nhất 2 path này hay
  cố ý giữ tách biệt (xem Câu hỏi mở #3, đây là quyết định cần user/architect chốt, không tự bịa).

## Ngoài phạm vi (Non-goals) — draft, có mục để "Câu hỏi mở" vì ranh giới chưa rõ hẳn

- **Không** tự động unify voice top-level turn (Gemini Live) vào interface này trong bản này — đó
  là quyết định kiến trúc lớn hơn (đổi cách Live Voice hoạt động), thuộc epic roadmap riêng "Hợp
  nhất Voice Agent" (xem Câu hỏi mở #4 — cần user xác nhận rõ có coi đây là bước 1 của epic đó hay
  hoàn toàn tách biệt).
- **Không** đổi wire protocol AG-UI ra `apps/web` (ADR-0019 đã accepted/done) — interface này nằm
  bên trong `ChatService`, phía dưới tầng `send_agui()` map sang AG-UI event, không đổi contract
  phía ngoài.
- **Không** viết thêm implementation framework agent execution thứ 2 thật (không import CrewAI/
  AutoGen/framework khác) trong bản này — chỉ tách ranh giới, LangGraph vẫn là (rất có thể) implementation
  duy nhất tồn tại sau khi làm xong feature này.
- Có cần 1 **registry** (`dict` theo key, giống `ProviderAdapter`/`ToolBuilder`,
  [`01-backend-fastapi.md`](../conventions/01-backend-fastapi.md) mục "Modular/swappable
  component") hay chỉ cần 1 class/module đơn giản (vì hiện chỉ có đúng 1 implementation thật) —
  **chưa quyết, để "Câu hỏi mở"** (xem #2) vì convention hiện có ngưỡng rõ: "≥2 cài đặt thật + đau
  thật ở ≥2 call site" mới trừu tượng hoá bằng registry, không trừu tượng hoá "phòng hờ".

## Thiết kế

Không viết ở đây — đây là phần việc của `solution-architect` sau khi Goals/Non-goals được chốt.
Insight kỹ thuật (nếu cần thêm sau research) sẽ đặt ở `docs/research/agent-runtime-abstraction.md`
nếu có, không đặt trong file spec này.

## Câu hỏi mở — đã trả lời (2026-08-30, xem [ADR-0020](../adr/0020-agent-runtime-interface.md))

1. **Streaming vs non-streaming → 2 method riêng** (`run_streaming`/`run_sync`) trên cùng 1
   interface — không ép chung 1 shape.
2. **Registry → KHÔNG, chưa cần** — chỉ 1 interface + 1 implementation (`LangGraphAgentRuntime`)
   cho tới khi có framework thứ 2 thật.
3. **Hợp nhất `build_agent_executor`/`run_sub_agent` → CÓ**, cùng 1 implementation, 2 method khác
   nhau đúng theo bản chất khác nhau của chúng (không giả vờ giống nhau).
4. **Quan hệ với "Hợp nhất Voice Agent" → là bước nền tảng đầu tiên**, nhưng KHÔNG tự cover việc
   unify voice top-level turn — vẫn cần ADR riêng sau cho quyết định đó.
5. **Vị trí module → `app/core/agent_runtime.py`** (không phải `app/modules/chat/`) — vì `voice`
   cần gọi, tránh vi phạm rule "service không import service module khác".

(Câu hỏi mở gốc giữ nguyên bên dưới để tham khảo ngữ cảnh — không xoá lịch sử quyết định.)

1. **Streaming vs non-streaming**: interface có cần cover cả 2 kiểu chạy hiện có (a. streaming +
   checkpoint + approval — `build_agent_executor`/`ChatService`; b. non-streaming `ainvoke` không
   checkpoint/approval — `run_sub_agent`) trong cùng 1 method, hay tách 2 method riêng biệt trên
   cùng interface (`run_streaming(...)` / `run_sync(...)`)? Ép chung 1 method có thể là "ép 2 use
   case khác bản chất vào 1 khuôn" (bài học ADR-0013 đã từng bác đề xuất tương tự cho `Tool.config`
   JSON tự do) — cần cân nhắc kỹ trước khi chốt.
2. **Có cần registry đa implementation ngay hay chỉ cần tách interface**: hiện chỉ có 1
   implementation thật (LangGraph) — đúng tinh thần convention "không trừu tượng hoá cho tương lai
   chưa tới", có nên chỉ tách 1 interface + 1 implementation cụ thể (không cần `dict` registry) cho
   tới khi có framework thứ 2 thật cần dùng, hay dựng registry ngay vì đây là quyết định kiến trúc
   dài hạn muốn chốt 1 lần?
3. **Có hợp nhất `build_agent_executor` (turn có checkpoint/approval) với `run_sub_agent` (turn
   không checkpoint/approval, dùng cho sub-agent delegation VÀ voice tool-call) vào cùng 1 khái
   niệm "chạy qua `AgentRuntime`" không**, hay đây là 2 khái niệm khác nhau có chủ đích (đã có
   comment trong code giải thích lý do sub-agent không có nested approval) và nên giữ tách biệt,
   chỉ 1 trong 2 đi qua interface mới?
4. **Quan hệ với epic "Hợp nhất Voice Agent"** (roadmap, chưa có spec/ADR riêng): bản này có nên
   coi là bước nền tảng đầu tiên của epic đó (và roadmap nên trỏ epic đó sang đọc bản này trước),
   hay hoàn toàn tách biệt — epic voice vẫn cần spec/ADR riêng của chính nó để quyết "voice
   top-level turn có nên đi qua LangGraph/`AgentRuntime` hay tiếp tục để Gemini Live làm turn chính"?
5. **Đặt module ở đâu**: `app/modules/chat/` (interface + implementation LangGraph nằm cạnh nhau,
   nơi đang dùng) hay tách hẳn ra `app/core/` (vì `voice` module cũng cần gọi, và
   `01-backend-fastapi.md` có rule "service không import service/repository module khác" — cần vị
   trí không vi phạm boundary đó khi `voice` gọi sang)? Để `solution-architect` quyết theo convention,
   nhưng cần biết trước liệu user có coi đây là "core, dùng chung nhiều module" hay "thuộc về chat,
   voice tạm gọi qua `ChatService` như hiện tại".

## Acceptance criteria

- [x] `AgentRuntime` (`Protocol`) định nghĩa ở `app/core/agent_runtime.py` với `run_streaming`/
      `run_sync`, không lộ type/API riêng của LangGraph (`CompiledStateGraph`/`Command`/
      `astream_events` shape) ra chữ ký public.
- [x] `LangGraphAgentRuntime` implement cả 2 method, giữ nguyên hành vi hiện có (checkpoint +
      approval gate cho `run_streaming`, không có cho `run_sync`) — không đổi behavior, chỉ đổi
      vị trí code.
- [x] `ChatService.send()`/`approve()` gọi qua `AgentRuntime` (`_stream_and_persist` helper mới,
      gom logic persist chung) thay vì tự `build_agent_executor()` +
      `astream_events`/`aget_state`/`Command` trực tiếp.
- [x] `_build_sub_agent_tool`/`run_sub_agent` (tool delegate, vẫn ở `chat/graph.py` — internal,
      không gọi vòng qua interface) và `voice/service.py::handle_tool_call` (external caller) đổi
      sang gọi `AgentRuntime.run_sync` thay vì import `run_sub_agent` trực tiếp.
- [x] `send_agui()` vẫn map đúng event AG-UI như trước (ADR-0019 không đổi) — chỉ nguồn event đổi.
- [x] `ruff`/`check_module_boundaries.py`/`pytest -q` xanh (89 passed); test hiện có
      (`tests/unit/chat/test_chat_service.py`) cập nhật monkeypatch từ `chat_service_module.
      build_agent_executor` sang `agent_runtime_module.build_agent_executor` (đổi chỗ patch, không
      đổi assertion hành vi).
