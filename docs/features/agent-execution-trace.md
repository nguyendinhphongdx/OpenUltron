# Feature: Agent Execution Trace (Phase 1 — xem)

Status: done (Phase 1, 2026-08-31)

## Vấn đề / động lực

Agent chạy đúng vòng lặp ReAct (`langchain.agents.create_agent`: model → tool → model → tool →
... → trả lời), nhưng UI chat không hề hiện các bước trung gian — `ThinkingIndicator.tsx` chỉ có
1 trạng thái "đang nghĩ..." chung cho cả turn, và `ChatMessage.tsx` không có renderer nào cho
`tool-call` part nên mọi hoạt động gọi tool bị "vô hình" với user. Đây là Phase 1 trong 2 phase đã
thống nhất với user — Phase 2 ("Agent Execution Flow", cho user tự chỉnh sửa reasoning loop thay vì
chỉ ReAct mặc định) cần 1 ADR riêng, không nằm trong scope tài liệu này.

## Mục tiêu (Goals)

- Hiện lại đúng thứ tự `think → gọi tool X (args) → kết quả → think tiếp → gọi tool Y → trả lời`
  trong lúc turn đang stream live.
- Tách đúng 2 lần gọi CÙNG 1 tool trong 1 turn — bug có sẵn trước đây (`toolCallId` tra theo tên
  tool) khiến 2 lần gọi lặp có thể lẫn id.

## Ngoài phạm vi (Non-goals)

- **Không persist trace vào `Message.metadata`** — chỉ hiện cho turn đang stream live, F5 lại
  trang KHÔNG còn thấy trace của turn cũ (chỉ còn câu trả lời cuối). Khác citation feature
  (`kb-citation.md`) đã persist `sources` — ở đây chủ đích dừng ở mức "live-only" để giữ Phase 1
  nhỏ. Có thể làm persist sau nếu cần, theo đúng pattern `sources`/`CitationSource` đã có.
- **Không chỉnh sửa được reasoning loop** — đó là Phase 2 ("Agent Execution Flow"), cần ADR riêng
  vì đổi kiến trúc thật sự (không chỉ hiện lại dữ liệu có sẵn như Phase 1 này).

## Thiết kế

- `apps/api/app/core/agent_runtime.py::_stream_turn` — `on_tool_start`/`on_tool_end` (LangChain
  `astream_events` v2) giờ giữ lại `run_id` (id ổn định xuyên suốt 1 lần gọi tool cụ thể — phân
  biệt 2 lần gọi cùng tên tool trong 1 turn), `input` (args dict), `output` (text kết quả, qua
  `_tool_output_text` — đọc `.content` nếu là `ToolMessage`, cắt ở 2000 ký tự).
- `apps/api/app/modules/chat/service.py::send_agui` — bỏ `active_tool_call_ids` (dict tra theo
  tên tool, có bug lẫn id khi gọi lặp) — dùng thẳng `f"tool-{run_id}"` làm `toolCallId`. Emit thêm
  `TOOL_CALL_ARGS` (ngay sau `TOOL_CALL_START`) và `TOOL_CALL_RESULT` (ngay trước `TOOL_CALL_END`)
  — 2 event AG-UI đã có sẵn trong protocol, trước đây chỉ dùng ở nhánh `approval_required`.
- `apps/web/src/features/conversation/components/ToolCallStep.tsx` (mới) — component đăng ký làm
  `components.tools.Fallback` trong `MessagePrimitive.Parts` (`ChatMessage.tsx`) — áp dụng cho MỌI
  tool-call part, không cần đăng ký riêng theo tên tool. Hiện dạng step chip thu gọn (`<details>`),
  mở ra thấy args (JSON) + kết quả.
- Thứ tự hiển thị đúng tự nhiên vì AG-UI's run-aggregator giữ nguyên thứ tự chronological trong
  `content` array của message — không cần logic sắp xếp riêng ở FE.

## Câu hỏi mở

- Có nên persist trace (giống `sources`) để không mất khi F5? → để sau, tuỳ nhu cầu thực tế dùng.

## Acceptance criteria

- [x] `_stream_turn` giữ `run_id`/`input`/`output` cho tool_call_start/end.
- [x] `send_agui` emit `TOOL_CALL_ARGS`/`TOOL_CALL_RESULT`, dùng `run_id` làm `toolCallId` (không
      còn dict tra theo tên tool).
- [x] `ToolCallStep.tsx` hiện step chip cho mọi tool-call part.
- [x] Test: gọi cùng 1 tool 2 lần trong 1 turn vẫn tách đúng 2 `toolCallId` khác nhau
      (`test_send_agui_gives_distinct_tool_call_ids_for_repeated_tool_in_same_turn`).
- [ ] Chưa live-verify qua browser thật (không có Postgres/model trong sandbox lúc code).
