# Feature: Agent Execution Strategy (ReAct mặc định / Plan-Execute tuỳ chọn)

Status: draft

## Vấn đề / động lực

Agent runtime hiện tại ([ADR-0005](../adr/0005-langgraph-agent-execution.md),
[ADR-0020](../adr/0020-agent-runtime-interface.md)) luôn dùng `langchain.agents.create_agent` —
1 factory dựng sẵn theo đúng 1 shape cố định (`model ⇄ tools`, ReAct interleave: model tự quyết
định từng bước có gọi tool hay không, không có bước "lập kế hoạch" tách riêng trước khi thực thi).
User muốn có lựa chọn khác — 1 chiến lược **Plan-Execute** (agent lập danh sách bước cần làm TRƯỚC,
rồi thực thi tuần tự từng bước) — cấu hình được lúc tạo/sửa agent, không phải đổi cứng toàn hệ
thống. Đây không phải giới hạn của LangGraph (LangGraph là graph framework tổng quát, Plan-Execute
là 1 pattern chính thức của nó) — mà là do Ultron đang dùng API tiện lợi cấp cao thay vì tự build
`StateGraph`.

## Mục tiêu (Goals)

- Thêm 1 field trên `Agent` (chỉ áp dụng agent **top-level** — agent user chat trực tiếp hoặc
  orchestrator gốc) chọn chiến lược thực thi: `react` (mặc định, giữ nguyên hành vi hiện tại) hoặc
  `plan_execute`.
- UI tạo/sửa agent có 1 tab riêng để xem/đổi chiến lược này.
- Chiến lược `plan_execute`: agent nhận input → sinh danh sách bước (kế hoạch) → thực thi tuần tự
  từng bước (mỗi bước có thể gọi tool/sub-agent/KB search như bình thường) → tổng hợp kết quả cuối.
- Tool/KB/sub-agent gán cho agent vẫn dùng được y hệt bất kể chiến lược nào — đổi chiến lược chỉ
  đổi **shape của graph điều phối**, không đổi tập năng lực (tool) agent có quyền dùng.

## Ngoài phạm vi (Non-goals)

- **Sub-agent luôn chạy ReAct** — không có field chọn chiến lược cho sub-agent (giữ đơn giản,
  đúng quyết định đã chốt với user 2026-09-02). Nếu sau này cần, mở rộng thêm không phá field hiện
  có.
- **Replan giữa chừng** (agent tự lập lại kế hoạch nếu 1 bước thực thi không như mong đợi) — không
  làm ở v1, chỉ Plan → Execute tuần tự 1 lần. Có thể thêm sau như 1 chiến lược `plan_execute_replan`
  riêng, không sửa `plan_execute` đã có.
- **Voice** — voice hiện không chạy qua `build_agent_executor` cho turn chính (xem
  [live-voice-agent.md](live-voice-agent.md)/ADR-0020 Non-goals), nên field chiến lược này không
  ảnh hưởng voice ở v1.
- **Không tự quyết kiến trúc graph mới trong spec này** — build `StateGraph` riêng cho
  `plan_execute` là quyết định kiến trúc thật, tách sang ADR riêng (dự kiến `ADR-0021`, soạn qua
  `adr-writer` sau khi spec này `accepted`).

## Thiết kế

Phần thiết kế chi tiết (schema field, shape `StateGraph` cho `plan_execute`, cách
`build_agent_executor` chọn nhánh theo `execution_strategy`) chốt trong **ADR-0021** (soạn riêng
sau khi Goals/Non-goals ở trên được xác nhận) — spec này chỉ giữ khung để bàn phạm vi trước.

Sơ bộ (chưa chốt, sẽ vào ADR):
- `Agent.execution_strategy: Literal["react", "plan_execute"] = "react"` — migration Alembic thêm
  cột, default giữ hành vi cũ cho agent đã có sẵn.
- `chat/graph.py::build_agent_executor` rẽ nhánh theo field này: `react` → giữ nguyên
  `create_agent(...)` hiện tại; `plan_execute` → 1 hàm build mới, tự `StateGraph` với node
  `planner` (LLM sinh list step) → `executor` (loop qua step, mỗi step có thể là 1 lần gọi
  model+tool) → `END`.
- Approval gate (ADR-0014) phải áp dụng cho cả 2 nhánh như nhau (tool rủi ro cao vẫn phải duyệt dù
  chạy trong graph nào).

## Câu hỏi mở

- Node `executor` của `plan_execute` có tự nó lặp ReAct (model⇄tools) cho MỖI step, hay mỗi step
  chỉ được phép 1 lần gọi tool? → cần quyết trong ADR-0021 (ảnh hưởng shape graph).
- Approval-gate middleware (`HumanInTheLoopMiddleware`) có tương thích thẳng với `StateGraph` tự
  build, hay cần tự viết node approval riêng cho nhánh `plan_execute`? → cần research trong
  ADR-0021 trước khi chốt.
- UI tab hiển thị plan đã sinh ra cho user xem/sửa trước khi thực thi (giống "confirm plan"), hay
  chỉ chạy tuần tự tự động không cần xác nhận? → ảnh hưởng UX, cần hỏi user khi bàn ADR/plan chi
  tiết.

## Acceptance criteria

- [ ] ADR-0021 (chiến lược execution, shape `StateGraph` cho `plan_execute`) ở trạng thái accepted.
- [ ] `Agent.execution_strategy` field + migration, mặc định `react`, không đổi hành vi agent cũ.
- [ ] UI tab chọn chiến lược trong form tạo/sửa agent top-level (không hiện cho sub-agent).
- [ ] Chat với agent `plan_execute` chạy đúng: sinh plan → thực thi từng bước → trả lời tổng hợp.
- [ ] Tool/KB/sub-agent vẫn hoạt động đúng trong cả 2 chiến lược.
- [ ] Approval gate (ADR-0014) vẫn chặn đúng tool rủi ro cao ở cả 2 nhánh.
