# ADR-0019 — AG-UI stream contract + assistant-ui chat runtime

🟢 Accepted

- **Status**: accepted
- **Date**: 2026-08-30

## Context

Ultron đã có nhiều capability agent thật: model provider adapter, tool HTTP/builtin/MCP, KB/RAG,
approval gate, orchestrator delegation và live voice. Nhưng UI chat text hiện đọc SSE bằng hook tự
viết và event names tự chế (`delta`, `tool_call_start`, `approval_required`). Voice dùng WebSocket
riêng. Nếu tiếp tục như vậy, mỗi capability mới sẽ ép `apps/web` tự invent thêm state/event, khó
đạt UX giống ChatGPT/Gemini và khó thay runtime sau này.

User muốn “chuẩn hoá stream, runtime, UI chat” và dùng assistant-ui/AG-UI, đồng thời chuẩn bị để
voice agent không tách thành flow riêng.

## Decision

- Chọn **AG-UI** làm wire protocol chuẩn giữa `apps/api` và chat UI cho text-agent stream.
- Chọn **assistant-ui** làm frontend chat runtime/component foundation, dùng adapter
  `@assistant-ui/react-ag-ui` + `@ag-ui/client` `HttpAgent`.
- Giữ `ChatService`/LangGraph hiện tại là internal execution trong giai đoạn đầu; thêm adapter
  endpoint `POST /conversations/{conversation_id}/chat/agui` để map event nội bộ sang AG-UI.
- Không xoá endpoint SSE cũ ngay. `/chat` vẫn là compatibility path cho test/client cũ; UI chính
  sẽ chuyển sang `/chat/agui`. **Cập nhật 2026-08-30**: `apps/web` đã migrate hoàn toàn sang
  `/chat/agui` (xác nhận 0 call site còn gọi `/chat`/`/chat/approve`), route + schema
  (`ChatRequest`/`ApprovalRequest`) tương ứng đã xoá khỏi `chat/router.py`/`chat/schemas.py` —
  compatibility path coi như hết nhiệm vụ, không giữ vô thời hạn (đúng điều kiện xoá nêu ở
  [10-module-completeness.md](../conventions/10-module-completeness.md)). `ChatService.send`/
  `approve` (method Python) vẫn giữ nguyên, chỉ mất route HTTP thừa.
- AG-UI event subset bắt buộc giai đoạn đầu:
  - `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`
  - `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END`
  - `TOOL_CALL_START`, `TOOL_CALL_END`
- `approval_required` nội bộ được map sang `RUN_FINISHED` outcome `interrupt` với interrupt
  `reason="tool_call"`, kèm `toolCallId` và metadata argument.
- Đây là bước đầu của unified runtime, chưa phải refactor voice/orchestrator hoàn chỉnh. Voice và
  Orchestrator v2 cần spec/ADR riêng khi đụng kiến trúc execution sâu hơn.

## Consequences

- ✅ Frontend chat có runtime chuẩn, bớt state tự chế.
- ✅ Backend có contract ổn định hơn, không leak event LangGraph nội bộ ra UI.
- ✅ Có đường thay LangGraph/assistant runtime sau này qua adapter, không đập toàn bộ UI.
- ⚠️ Thêm dependency mới ở `apps/web`; cần theo dõi API vì `@assistant-ui/react-ag-ui` còn
  experimental.
- ⚠️ ~~Giai đoạn đầu tồn tại song song SSE cũ và AG-UI endpoint mới.~~ Đã hết, xem cập nhật
  2026-08-30 ở mục Decision — chỉ còn `/chat/agui`.
- ⚠️ Approval/tool trace mới chỉ map tối thiểu; trace persistence và orchestrator v2 vẫn là nợ lớn.

## Alternatives considered

- **Giữ hook SSE tự viết**: loại vì càng thêm tool/approval/voice càng thành runtime tự chế khó
  maintain.
- **Dùng Vercel AI SDK làm UI runtime chính**: tốt cho chat completion/tool stream phổ biến, nhưng
  không first-class cho agent event/interruption/orchestrator trace bằng AG-UI trong bài toán này.
- **Dùng AG-UI nhưng không assistant-ui**: vẫn phải tự viết thread/composer/approval UX nhiều; trái
  mục tiêu chuẩn hoá UI chat nhanh.
- **Đổi backend sang LangGraph SDK/API ngay**: quá rộng, chạm execution/orchestrator/voice cùng lúc;
  chọn adapter endpoint trước để giảm rủi ro.
