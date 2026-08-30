# Feature: Unified Agent Stream Runtime

Status: done (2026-08-30) — mọi acceptance criteria đã đạt, endpoint cũ đã xoá. Voice chưa refactor
chung `AgentRuntime` (đúng Non-goals đã ghi) — theo dõi ở roadmap mục riêng.

## Vấn đề / động lực

Chat text hiện stream qua SSE tự chế (`delta`, `tool_call_start`, `approval_required`...), còn
voice lại đi WebSocket riêng. Frontend phải tự parse chunk và tự giữ state hội thoại, approval,
tool trace. Cách này chạy được path cơ bản nhưng bắt đầu nứt khi cần UI giống ChatGPT/Gemini hơn:
stream chuẩn, tool trace rõ, approval first-class, voice chỉ là input modality khác của cùng agent.

## Mục tiêu (Goals)

- Chuẩn hoá text chat stream theo AG-UI event protocol để UI không phụ thuộc event tự chế của
  `ChatService`.
- Dùng `assistant-ui` làm chat runtime/component foundation ở `apps/web`, bắt đầu qua AG-UI adapter.
- Giữ backward-compatible endpoint SSE cũ trong giai đoạn chuyển đổi để không phá các client đang
  gọi `/conversations/{id}/chat`.
- Tách rõ adapter boundary: backend có thể vẫn dùng LangGraph nội bộ, nhưng wire contract ra UI là
  AG-UI.
- Đặt nền cho voice dùng chung agent runtime ở bước sau: voice khác transport/audio, không khác
  capability execution.

## Ngoài phạm vi (Non-goals)

- Chưa refactor voice chạy chung `AgentRuntime` trong feature này; roadmap đã có epic riêng.
- Chưa thay orchestrator v2/routing policy/edge contract; roadmap đã có epic riêng.
- ~~Chưa xoá endpoint stream cũ; chỉ thêm endpoint AG-UI mới và chuyển UI chính sang dùng endpoint
  mới.~~ **Cập nhật 2026-08-30**: `apps/web` đã migrate hoàn toàn sang `/chat/agui`, endpoint
  `/chat`+`/chat/approve` cũ đã xoá khỏi `chat/router.py` (0 call site FE còn dùng) — trả lời luôn
  câu hỏi mở bên dưới.
- Chưa persist đầy đủ `tool_calls`/trace DB; chỉ chuẩn hoá event stream để UI hiển thị đúng hơn.

## Thiết kế

- Thêm endpoint `POST /conversations/{conversation_id}/chat/agui` nhận AG-UI `RunAgentInput` từ
  `@ag-ui/client` `HttpAgent`.
- Backend map message user cuối cùng trong `body.messages` thành `ChatService.send(...)`, rồi map
  event nội bộ sang AG-UI:
  - `RUN_STARTED`
  - `TEXT_MESSAGE_START`
  - `TEXT_MESSAGE_CONTENT`
  - `TEXT_MESSAGE_END`
  - `TOOL_CALL_START`
  - `TOOL_CALL_END`
  - `RUN_FINISHED`
  - `RUN_ERROR`
- Khi gặp `approval_required`, backend phát `TOOL_CALL_START/END` + `RUN_FINISHED` outcome
  `interrupt`, để `assistant-ui`/AG-UI adapter render approval thay vì UI tự chế.
- Frontend tạo `HttpAgent` từ `@ag-ui/client` và `useAgUiRuntime` từ
  `@assistant-ui/react-ag-ui`, bọc bằng `AssistantRuntimeProvider` của `@assistant-ui/react`.
- UI chat chính dùng primitive của `assistant-ui` nhưng vẫn skin theo visual convention Ultron
  (Soft Glass Workspace Console).

## Câu hỏi mở

- ~~Có cần bỏ hoàn toàn endpoint SSE cũ sau khi AG-UI ổn định không?~~ **Trả lời 2026-08-30**: Có —
  đã xoá (0 call site FE còn dùng, xem cập nhật ở Non-goals).
- Nên expose approval qua projection tool approval mặc định của assistant-ui hay giữ UI interrupt
  riêng cho quyết định có argument dài?
- Voice realtime nên phát AG-UI events trực tiếp qua WebSocket hay qua adapter bridge riêng?

## Acceptance criteria

- [x] `apps/web` gửi message qua assistant-ui runtime, không còn dùng hook tự parse SSE trong màn
      chat chính.
- [x] Backend endpoint AG-UI phát event hợp lệ với `@ag-ui/core` parser (`HttpAgent` đọc được).
- [x] Token text vẫn stream tăng dần trong UI.
- [x] Tool start/end và approval gate vẫn hiển thị được trong UI.
- [x] ~~Endpoint cũ `/chat` vẫn pass test hiện có trong giai đoạn migrate.~~ Migrate xong, endpoint
      cũ đã xoá thay vì giữ pass test song song (2026-08-30).
- [x] `pnpm --filter @ultron/web typecheck && pnpm --filter @ultron/web build` xanh.
