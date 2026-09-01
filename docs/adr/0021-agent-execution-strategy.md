# ADR-0021 — Agent execution strategy: `react` (mặc định) và `plan_execute`

🟡 Proposed

- **Status**: proposed
- **Date**: 2026-09-02

## Context

[docs/features/agent-execution-strategy.md](../features/agent-execution-strategy.md) đã chốt scope:
thêm 1 chiến lược thực thi thứ 2 — `plan_execute` — bên cạnh `react` hiện tại, chọn được lúc
tạo/sửa agent **top-level** (agent user chat trực tiếp hoặc orchestrator gốc), sub-agent (delegate)
luôn chạy `react`, không có field chọn. Spec chủ động để lại 3 câu hỏi mở cho ADR này quyết, và cả 3
đều xoay quanh 1 sự thật đọc được từ code thật (không phải suy đoán):

`chat/graph.py::build_agent_executor` (dòng ~240-276) hiện gọi thẳng
`langchain.agents.create_agent(...)` — 1 factory **tự dựng `StateGraph` bên trong nó**, bao gồm cả
việc wire middleware hook thành node/edge của graph. Đọc
`apps/api/.venv/lib/python3.12/site-packages/langchain/agents/factory.py` (hàm `create_agent`,
dòng ~1100-1800): `create_agent` tự thêm node `"model"`, node `"tools"`, và với mỗi middleware có
override `after_model`/`aafter_model` — thêm 1 node tên `f"{m.name}.after_model"` + tự nối edge
theo thứ tự middleware, xử lý `can_jump_to`. Toàn bộ logic wiring này (đặt tên node, thứ tự edge,
điều hướng jump) là **private, nằm trong `factory.py`, không export public API để tái dùng cho 1
`StateGraph` tự build khác**. Ngược lại, đọc
`apps/api/.venv/lib/python3.12/site-packages/langchain/agents/middleware/human_in_the_loop.py`:
`HumanInTheLoopMiddleware` (ADR-0014) chỉ implement **2 hook đơn giản** —
`after_model(self, state: AgentState, runtime: Runtime) -> dict | None` và `aafter_model` (gọi lại
`after_model`) — bản thân hook này là 1 **hàm thuần**: đọc `state["messages"]`, tìm `AIMessage`
cuối có `tool_calls`, gọi `langgraph.types.interrupt(...)` với payload `HITLRequest`
(`action_requests`/`review_configs`), rồi trả `{"messages": [...]}` sau khi xử lý quyết định
approve/edit/reject/respond — **không phụ thuộc bất kỳ cơ chế wiring riêng nào của
`create_agent`**, chỉ cần 1 `state` đúng shape (`messages`) và 1 `Runtime` hợp lệ.

`app/core/agent_runtime.py::_stream_turn` (tầng gọi executor, ADR-0020) cũng đã graph-agnostic sẵn:
dùng `executor.astream_events(...)` (bắt `on_chat_model_stream`/`on_tool_start`/`on_tool_end` — sự
kiện chuẩn của LangGraph runnable, không riêng gì `create_agent`) và `executor.aget_state(...)` +
đọc `state.tasks[*].interrupts[*].value["action_requests"]` (`_first_action_request`) để phát hiện
pause — cả hai đều hoạt động với **bất kỳ `CompiledStateGraph` nào có checkpointer**, miễn state có
key `messages` và node approval gọi `interrupt()` đúng shape `HITLRequest`. Tức là tầng streaming/
approval-detect phía trên **không cần sửa gì** khi thêm nhánh `plan_execute`, miễn graph mới tuân
thủ đúng 2 điều kiện đó.

## Decision

### 1. Shape graph cho `plan_execute`

1 hàm mới `build_plan_execute_executor(...)` trong `chat/graph.py` (cùng chữ ký tham số với
`build_agent_executor` hiện tại — `system_prompt`, `model`, `sub_agents`, `tools`,
`knowledge_bases`, `session`, `citation_sources`), tự dựng `StateGraph` với state mở rộng
`AgentState` (`messages`) thêm 3 field: `plan: list[str]`, `current_step: int`,
`step_results: list[str]`.

Node/edge:

```
planner ──▶ inject_step ──▶ model ──▶ approval ──┬─▶ tools ──▶ model   (loop: còn tool_call)
                                                  └─▶ step_advance ──▶ inject_step (còn step)
                                                                   └─▶ synthesize ──▶ END
```

- **`planner`**: 1 lần gọi model (cùng `chat_model`/`system_prompt` của agent, có thêm instruction
  "liệt kê các bước cần làm") → sinh `plan: list[str]`. Structured output qua
  `chat_model.with_structured_output(...)` (đã dùng pattern này ở nơi khác trong codebase, tái dùng
  không thiết kế mới) — KHÔNG parse tay text tự do, tránh lỗi format.
- **`inject_step`**: thêm 1 `HumanMessage` mô tả bước hiện tại (`plan[current_step]`) + tóm tắt kết
  quả các bước trước (`step_results`) vào `messages`, rồi sang `model`.
- **`model`**: **y hệt node `model` của `create_agent`** — gọi `chat_model.bind_tools(all_tools)`.
- **`approval`**: **gọi thẳng `HumanInTheLoopMiddleware(...).after_model(state, runtime)`** làm thân
  hàm node — KHÔNG viết lại logic interrupt/decision từ đầu, KHÔNG cố gắng "đăng ký" middleware qua
  cơ chế của `create_agent` (không public, không tái dùng được, xem Context). `runtime` lấy qua
  `langgraph.runtime.get_runtime()` bên trong hàm node (API public của `langgraph`, không cần đi
  qua `create_agent`). Cùng 1 instance `_human_in_the_loop_middleware(tools)` (helper đã có, dùng
  lại nguyên vẹn) cho cả 2 nhánh `react`/`plan_execute` — đảm bảo đúng yêu cầu "approval gate chặn
  đúng tool rủi ro cao ở CẢ 2 nhánh" bằng cách dùng chung 1 implementation, không phải 2 bản logic
  approval khác nhau có thể lệch nhau theo thời gian.
- **Điều hướng sau `approval`**: nếu `AIMessage` cuối (sau khi middleware xử lý xong quyết định
  approve/reject) còn `tool_calls` → sang `tools` (thực thi, dùng `ToolNode` như `create_agent`) rồi
  quay lại `model` (loop trong CÙNG 1 step, xem mục 2). Nếu không còn `tool_calls` → coi nội dung
  `AIMessage` là kết quả bước hiện tại → `step_advance`.
- **`step_advance`**: append kết quả vào `step_results`, `current_step += 1`. Còn bước tiếp theo →
  `inject_step`. Hết bước → `synthesize`.
- **`synthesize`**: 1 lần gọi model cuối, tổng hợp `step_results` thành câu trả lời cuối cho user.

Checkpointer (`get_checkpointer()`) + `citation_sources` wiring giữ nguyên như `build_agent_executor`
hiện tại (cùng cơ chế, không đổi).

`build_agent_executor` (tên hàm giữ nguyên, không đổi call site ở `agent_runtime.py`) nhận thêm
tham số `execution_strategy: Literal["react", "plan_execute"] = "react"`, rẽ nhánh ngay đầu hàm:
`"react"` → giữ nguyên toàn bộ code `create_agent(...)` hiện có (0 thay đổi hành vi); `"plan_execute"`
→ gọi `build_plan_execute_executor(...)`. Cả 2 nhánh cùng trả `CompiledStateGraph` — `agent_runtime.py`
(`LangGraphAgentRuntime.run_streaming`, `_stream_turn`) **không sửa gì** (đã graph-agnostic, xem
Context).

### 2. Câu hỏi (a) — mỗi step lặp ReAct hay chỉ 1 lần gọi tool?

**Quyết định: lặp ReAct (model ⇄ tools) TRONG mỗi step, không giới hạn 1 lần gọi tool.** Lý do: ép
"1 step = 1 tool call" buộc `planner` phải sinh kế hoạch mịn bất thường (vd tách "đọc file rồi
grep nó" thành 2 step riêng dù về logic là 1 việc), dễ sinh kế hoạch sai số bước thực tế cần, và
không khớp cách model thật sự cần dùng tool (1 câu hỏi nhiều khi cần 2-3 lần gọi tool nối tiếp mới
đủ thông tin trả lời). Graph ở mục 1 cho phép điều này tự nhiên: `model → approval → tools → model`
loop lại trong CÙNG 1 `current_step` cho tới khi `AIMessage` không còn `tool_calls`, LÚC ĐÓ mới coi
là xong step và sang `step_advance` — không cần thêm state đếm số lần lặp trong step (không giới
hạn cứng số vòng lặp/step, giống cách `create_agent` không giới hạn số vòng ReAct của nó — dựa vào
`recursion_limit` mặc định của LangGraph làm lưới an toàn chung, không phải cơ chế riêng cho
`plan_execute`).

### 3. Câu hỏi (b) — `HumanInTheLoopMiddleware` compatible thẳng với `StateGraph` tự build?

**Không compatible qua cơ chế "đăng ký middleware" của `create_agent` (đó là private wiring, xem
Context) — NHƯNG hook `after_model` của nó tái dùng được trực tiếp làm thân 1 node** vì bản chất là
1 hàm thuần nhận `(state, runtime)`, không phụ thuộc gì việc graph được build bởi `create_agent` hay
tay. Quyết định: KHÔNG viết lại logic approval riêng cho `plan_execute` (tránh 2 bản logic
lệch nhau theo thời gian — đúng bài học "1 nguồn sự thật" đã áp dụng nhiều ADR trước) — node
`approval` gọi thẳng `middleware.after_model(state, get_runtime())`, dùng lại nguyên
`_human_in_the_loop_middleware(tools)` đã có.

### 4. Câu hỏi (c) — field mới ở đâu, migration ra sao

- `app/modules/agent/models.py::Agent` thêm cột (cùng pattern `Tool.kind`, String + comment liệt kê
  giá trị hợp lệ, KHÔNG dùng Postgres native enum — nhất quán với cách codebase đã làm cho
  `kind`/`provider`):

  ```python
  execution_strategy: Mapped[str] = mapped_column(String(20), default="react")  # react | plan_execute
  ```

- Migration Alembic mới (revision nối sau `c2d3e4f5a6b7`), 1 `op.add_column` — cùng dạng migration
  đã thêm `Agent.pos_x`/`pos_y`:

  ```python
  op.add_column(
      "agents",
      sa.Column("execution_strategy", sa.String(20), nullable=False, server_default="react"),
  )
  ```

  `server_default="react"` đảm bảo agent đã tồn tại giữ nguyên hành vi cũ (không cần backfill tay).
- Cột nằm trên bảng `agents` chung cho mọi agent (top-level lẫn sub-agent) — **không** thêm cột
  riêng/bảng riêng để "chỉ top-level mới có field này", vì việc "sub-agent luôn `react`" là ràng
  buộc **hành vi ở tầng chạy turn**, không phải ràng buộc dữ liệu: `SubAgentSpec`
  (`chat/graph.py`) và `run_sub_agent`/`AgentRuntime.run_sync` **không đọc** field này (không có
  field tương ứng trong `SubAgentSpec`, giữ nguyên như hiện tại) — luôn build qua `create_agent(...)`
  y hệt code hiện có. `AgentRunConfig` (`app/core/agent_runtime.py`, dùng cho `run_streaming` — turn
  top-level) thêm field `execution_strategy: str`, đọc từ `Agent.execution_strategy` của agent
  top-level đang chat/orchestrator gốc. UI (tab chọn chiến lược) chỉ hiện trong form tạo/sửa agent
  khi agent đó KHÔNG phải sub-agent của agent khác (điều kiện UI, không phải điều kiện DB) — chi
  tiết UI/API request shape thuộc phạm vi implement (`backend-engineer`/`frontend-engineer`), không
  cần quyết thêm ở ADR này.

## Consequences

- ✅ Approval gate (ADR-0014) dùng chung 1 implementation (`HumanInTheLoopMiddleware.after_model`)
  cho cả 2 nhánh — tool rủi ro cao được chặn nhất quán, không có 2 bản logic approval có thể lệch
  nhau.
- ✅ `react` không đổi hành vi gì (giữ nguyên `create_agent(...)`) — rủi ro regression cho agent hiện
  có gần như bằng 0.
- ✅ Tầng streaming/approval-detect (`agent_runtime.py`, ADR-0020) không cần sửa — đã graph-agnostic
  sẵn, xác nhận bằng đọc code (`_stream_turn` dùng `astream_events`/`aget_state`, không gọi API
  riêng của `create_agent`).
- ✅ Mỗi step cho phép nhiều lần gọi tool (loop ReAct trong step) — khớp cách agent thật sự cần dùng
  tool, không ép kế hoạch phải mịn bất thường.
- ⚠️ `build_plan_execute_executor` là 1 `StateGraph` tự tay dựng đầu tiên trong codebase (mọi chỗ
  khác đều qua `create_agent`) — thêm 1 lượng code/test mới (node/edge/state) so với chỉ gọi
  factory; chấp nhận được vì đây đúng là lằn ranh mà `create_agent` (API tiện lợi cấp cao) không
  che phủ được (không có khái niệm "step"/"plan" trong shape cố định của nó).
- ⚠️ `planner` sinh `plan` sai/quá chung chung (vd 1 bước duy nhất, không thực sự "plan") không có
  cơ chế phát hiện/sửa ở v1 — chấp nhận được vì Non-goal v1 đã loại "replan giữa chừng"; UI hiển
  thị/confirm plan trước khi chạy (câu hỏi mở thứ 3 trong spec, chưa quyết) có thể giảm rủi ro này ở
  vòng sau, không phải ADR này.
- ⚠️ `get_runtime()` gọi bên trong node tự viết là API `langgraph` "internal-ish" (không phải qua
  `create_agent`) — nếu `langgraph` đổi cách expose `Runtime` ở version sau, node `approval` của
  `plan_execute` phải sửa theo (cùng rủi ro version-drift mà ADR-0020 đã note cho
  `astream_events`/`Command`, không phải rủi ro mới).

## Alternatives considered

- **Nhồi `plan_execute` vào chung `create_agent(...)`** (vd qua 1 middleware `before_model` tự sinh
  plan rồi ProxyState): loại vì `create_agent` không có khái niệm "step" trong state của nó — sẽ
  phải hack state qua context/`store` thay vì field state tường minh, khó đọc/maintain hơn 1
  `StateGraph` tự build rõ ràng.
- **Mỗi step chỉ 1 lần gọi tool** (câu hỏi mở a, phương án bị loại): loại vì ép kế hoạch phải mịn
  bất thường, không khớp nhu cầu thật (1 câu hỏi nhiều khi cần nhiều tool call nối tiếp mới đủ
  thông tin).
- **Viết lại logic approval riêng cho `plan_execute`** (không tái dùng `HumanInTheLoopMiddleware`):
  loại vì tạo 2 nguồn sự thật cho cùng 1 rule bảo mật (tool nào cần duyệt) — rủi ro lệch nhau khi
  `TOOLS_REQUIRING_APPROVAL` (ADR-0014/0017) đổi mà chỉ 1 nhánh được cập nhật.
- **Mỗi step = 1 lần gọi nested `create_agent(...).ainvoke(...)`** (giống cách `run_sub_agent` chạy
  sub-agent, "step-as-subagent"): loại vì nested `ainvoke()` là 1 lần gọi đồng bộ, `interrupt()` bên
  trong không bubble lên checkpointer của graph cha theo cách pause/resume được qua
  `AgentRuntime.run_streaming` (đúng lý do `run_sub_agent` đã loại bỏ checkpointer/middleware ở
  ADR-0020) — sẽ mất approval gate ở CHÍNH XÁC nhánh cần nó nhất.
- **Thêm bảng/cột riêng để enforce "chỉ top-level mới có `execution_strategy`" ở tầng DB** (constraint,
  bảng phụ): loại vì đây là ràng buộc hành vi runtime (`SubAgentSpec` không đọc field), không phải
  ràng buộc toàn vẹn dữ liệu — thêm constraint DB cho 1 rule chỉ áp dụng ở tầng code là phức tạp hoá
  không cần thiết (agent nào cũng có thể trở thành sub-agent của agent khác qua `AgentDelegation`,
  ADR-0006 — 1 agent vẫn hợp lệ khi vừa là top-level vừa được delegate).
