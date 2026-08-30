# Feature: Orchestrator v2 — graph editor + run/debug đúng nghĩa

Status: accepted (2026-08-30) — chia phase, xem "Câu hỏi mở — đã trả lời" dưới. Nested-approval
fail-closed đã ghi thành ADR ([addendum ADR-0014](../adr/0014-tool-approval-gate.md)).

## Vấn đề / động lực

Orchestrator hiện tại (ADR-0006) chỉ có: `Agent.is_orchestrator=true` + `AgentDelegation` (edge
many-to-many, chống cycle qua BFS) + `OrchestratorCanvas.tsx` (`@xyflow/react`) cho **xem/thêm/gỡ
cạnh**. Cụ thể những gì đang thiếu, xác nhận bằng đọc trực tiếp code:

- **Edge không có contract riêng.** `chat/graph.py::_build_sub_agent_tool` bọc sub-agent thành 1
  LangChain tool với `description=sub_agent.description or f"Delegate task to '{sub_agent.slug}'"`
  — mô tả này là thuộc tính CHUNG của `Agent`, không phải riêng theo từng cạnh delegation. 1
  sub-agent được nhiều orchestrator gọi (many-to-many, đúng thiết kế ADR-0006) thì mọi orchestrator
  đều thấy cùng 1 mô tả — không thể nói rõ "orchestrator A gọi sub-agent này để làm X, orchestrator
  B gọi để làm Y" hay input/output mong đợi khác nhau theo từng cạnh.
- **Không có readiness check.** Agent thiếu credential provider (ADR-0010), model không hợp lệ,
  tool cấu hình sai, hay KB rỗng — không có cách nào biết trước khi chat thật; hiện tại chỉ phát
  hiện giữa lúc turn đang chạy (lỗi 400/502 ẩn trong luồng chat, không phải trên canvas).
- **Vị trí node chỉ lưu trong session.** `OrchestratorCanvas.tsx` (`manualPositions` state) đã có
  comment tự ghi rõ: "chỉ session hiện tại — chưa có field toạ độ ở `Agent` để lưu persistent... mất
  khi rời trang". Kéo sắp xếp lại graph mỗi lần mở trang là vô nghĩa lâu dài.
- **Không có run simulator.** Muốn thử "orchestrator này với input X sẽ đi qua sub-agent nào" phải
  chat thật qua `ConversationView`, không có cách chạy thử ngay trong canvas kèm xem path.
- **Không có trace inspector.** Roadmap đã ghi nợ riêng: "Ghi lại tool-call của orchestrator (gọi
  sub-agent) vào bảng `tool_calls` — hiện `create_agent` tự quản lý tool call nội bộ, chưa persist
  ra bảng đã thiết kế". Không biết lần chạy trước đi qua node/edge nào, input/output mỗi bước ra
  sao, mất bao lâu, lỗi ở đâu nếu có.
- **Nested approval chưa có chiến lược.** `chat/graph.py::run_sub_agent` có comment chủ đích: sub-
  agent (chạy lồng bên trong 1 lần gọi tool của agent cha) **không gắn checkpointer/middleware
  approval gate** — "pause lồng trong lúc agent cha đang chạy là bài toán phức tạp hơn hẳn (nested
  interrupt), ngoài phạm vi spec `tool-approval-gate.md`". Nghĩa là hiện tại: sub-agent gọi tool
  rủi ro cao (vd `run-command`, bắt buộc approval theo ADR-0016) **âm thầm không có gate nào chặn** —
  đây không chỉ là thiếu tính năng, là 1 khoảng trống an toàn thật cần quyết định rõ trước khi
  nested delegation được dùng nhiều hơn.

Đây đúng là epic "Orchestrator v2" đã ghi trong `docs/roadmap/README.md` mục "Đang làm/tiếp theo"
(P0) — spec này hiện thực hoá epic đó thành scope cụ thể để `solution-architect` lên plan.

## Mục tiêu (Goals) — draft, chờ user confirm

- **Edge contract**: mỗi `AgentDelegation` có thêm mô tả nhiệm vụ riêng theo cạnh đó (khi nào
  orchestrator nên gọi sub-agent này, input/output mong đợi) — sửa được qua canvas, dùng làm
  `description` của tool `delegate` thay vì dùng chung `agent.description`.
- **Readiness check**: trước khi chat/run, kiểm tra đệ quy toàn bộ agent + sub-agent trong graph
  (tái dùng kiểu duyệt BFS đã có ở `AgentService._creates_cycle`) — thiếu credential/model/tool
  config/KB → hiển thị rõ trên node (không phải đợi turn fail).
- **Saved layout**: vị trí node persist theo agent/graph (thêm field toạ độ), không mất khi rời
  trang.
- **Run simulator**: chạy thử graph với 1 input mẫu ngay trong canvas, thấy path đi qua node nào,
  không nhất thiết phải mở `ConversationView`.
- **Trace inspector**: xem lại (ít nhất) lần chạy gần nhất theo từng node/edge — input/output, thời
  gian, lỗi nếu có; đi kèm/khép lại nợ "persist tool_calls" đã ghi ở roadmap.
- **Chiến lược nested approval rõ ràng**: quyết định 1 trong các hướng (chặn hẳn sub-agent dùng tool
  cần approval; hay cho phép nhưng pause cả turn cha; hay khác) — không được tiếp tục để "âm thầm
  không gate" như hiện tại.

## Ngoài phạm vi (Non-goals)

- **A2A protocol thật (HTTP/JSON-RPC, gọi agent ngoài process/máy khác)** — ADR-0006 đã chốt chưa
  cần, giữ nguyên; graph vẫn chạy trong-process qua LangGraph.
- **Multi-user/collab editing graph** (nhiều người sửa cùng lúc, comment, version control theo
  team) — vi phạm rule 1-user (AGENTS.md rule 6).
- **Node "nhóm"/"sub-orchestrator" lồng UI như 1 khối riêng** — đa tầng delegation (sub-agent tự nó
  là orchestrator của agent khác) **đã có ở backend** (`MAX_DELEGATION_DEPTH`, đệ quy) từ trước;
  epic này chỉ cần canvas hiển thị/tương tác đúng với đa tầng đã có, không cần phát minh khái niệm
  UI mới kiểu "group node" (mockup cũ có gợi ý placeholder này nhưng đang để mờ, chưa quyết).

## Câu hỏi mở — đã trả lời (2026-08-30)

**Chia phase** (không làm 1 lần cả 6 mục) — thứ tự ưu tiên:

- **Phase A (an toàn, làm ngay, tách khỏi UI graph editor)**: nested approval fail-closed — sub-agent
  không được gán tool trong `TOOLS_REQUIRING_APPROVAL`/`kind=mcp` (xem
  [addendum ADR-0014](../adr/0014-tool-approval-gate.md)). Đây là fix an toàn độc lập, không phụ
  thuộc `AgentRuntime`/canvas mới.
- **Phase B (nền tảng)**: edge contract (mô tả tự do theo văn bản, KHÔNG cần structured schema
  kiểu `ai_params` — giữ đơn giản như `agent.description` hiện tại) + readiness check (tự động mỗi
  khi mở canvas/sửa graph, không chỉ on-demand — chi phí rẻ, UX tốt hơn).
- **Phase C (persistence)**: saved layout (field toạ độ persist) + trace inspector (chỉ giữ **lần
  chạy gần nhất**/node/edge — theo insight Dify "Last Run", rẻ hơn full history, khớp nợ "persist
  tool_calls" đã ghi ở roadmap).
- **Phase D (tương tác, làm sau cùng — phức tạp/rủi ro nhất)**: run simulator — **persist thật**
  qua `ChatService`/`AgentRuntime` (không dựng luồng sandbox riêng không lưu gì — thêm 1 code path
  nữa không cần thiết cho 1 người dùng; tạo `Conversation` thật khi chạy thử là chấp nhận được).

Lý do chia phase: Phase A là lỗ hổng an toàn thật, không nên chờ cả epic xong mới fix. Phase B/C là
nền tảng cho D. Phase D nặng nhất, giá trị thấp hơn với 1 người dùng so với 3 phase đầu.

Chi tiết câu hỏi gốc (giữ lại tham khảo ngữ cảnh quyết định):

- **Run simulator persist hay không?** Chạy thử trong canvas có tạo `Conversation`/`Message` thật
  (dùng lại `ChatService`) hay là 1 luồng tách biệt hoàn toàn không lưu gì? Ảnh hưởng lớn tới thiết
  kế backend — cần quyết trước khi giao `solution-architect`.
- **Trace inspector lưu bao nhiêu lịch sử?** Chỉ "lần chạy gần nhất" mỗi node/edge (rẻ, theo insight
  Dify "Last Run") hay full history nhiều lần chạy (đắt hơn, cần bảng riêng + truy vấn theo thời
  gian)? Roadmap ghi nợ "persist tool_calls" nhưng chưa nói rõ giữ bao lâu/bao nhiêu.
- **Nested approval — chọn hướng nào?** 3 hướng khả dĩ nêu ở Goals (chặn hẳn / pause cả turn cha /
  khác) — mỗi hướng đánh đổi khác nhau (an toàn vs. UX vs. độ phức tạp kỹ thuật). Cần user chọn
  hướng trước khi `solution-architect` thiết kế cơ chế.
- **Đây có phải 1 epic làm 1 lần hay cần chia nhỏ theo từng mục (contract → readiness → layout →
  simulator → trace → nested approval)?** Nếu chia nhỏ, thứ tự ưu tiên nào trước — spec này gộp cả
  6 mục vì roadmap mô tả chung 1 epic, nhưng `solution-architect` có thể đề xuất chia phase.
- **Edge contract có cần structured input/output schema (giống `ai_params` của `kind=http` tool,
  ADR-0013) hay chỉ cần mô tả tự do bằng văn bản** (theo insight nghiên cứu: gần tool description
  hơn n8n type-mapping)? Ảnh hưởng UI form khi sửa edge.
- **Readiness check chạy khi nào?** Chỉ on-demand (user bấm nút) hay tự động mỗi khi mở canvas/mỗi
  khi sửa graph?

## Acceptance criteria

- [ ] Sửa được mô tả nhiệm vụ riêng cho 1 `AgentDelegation` (edge) qua canvas, và giá trị đó được
      dùng làm `description` của tool `delegate` tương ứng khi orchestrator đó chạy thật (không
      phải `agent.description` chung).
- [ ] Canvas hiển thị badge/trạng thái readiness cho từng node (đủ cấu hình / thiếu gì cụ thể),
      dựa trên kiểm tra transitive toàn graph.
- [ ] Kéo sắp xếp lại vị trí node, rời trang rồi quay lại vẫn giữ đúng vị trí đã kéo (persist, không
      chỉ session).
- [ ] Chạy thử graph với 1 input mẫu ngay trong canvas, thấy được path/token stream đi qua node nào
      theo thời gian thực.
- [ ] Xem lại được ít nhất lần chạy gần nhất của graph theo từng node/edge (input/output, có/không
      lỗi).
- [x] **Phase A xong (2026-08-30)**: Có tài liệu/cơ chế rõ ràng cho việc sub-agent gọi tool cần
      approval — không còn tình trạng "âm thầm bỏ qua gate" như hiện tại. Fail-closed: `run_sub_agent`
      (`chat/graph.py`) loại tool trong `TOOLS_REQUIRING_APPROVAL`/`kind=mcp` khỏi tool list của
      sub-agent trước khi build (addendum [ADR-0014](../adr/0014-tool-approval-gate.md)), test mới
      `tests/unit/chat/test_run_sub_agent_fail_closed.py`. Phase B/C/D (edge contract, readiness
      check, saved layout, trace inspector, run simulator) vẫn chưa làm.

## Mockup

[`docs/mockups/orchestrator-v2.html`](../mockups/orchestrator-v2.html) — mở rộng
`ultron-orchestrator-canvas.html` đã có: edge contract panel, readiness badge trên node, tab Run
simulator, tab Trace inspector.
