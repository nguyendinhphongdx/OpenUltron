# ADR-0006 — Multi-agent org chart: Agent entity + AgentDelegation (many-to-many)

- **Status**: accepted
- **Date**: 2026-08-18

## Context

User cần tạo nhiều agent khác nhau (system prompt/model/mục đích khác nhau) và thiết lập quan hệ "org chart" giữa chúng: 1 agent orchestrator (agent to nhất, user chat trực tiếp) có thể gọi các sub-agent khác trong chart để xử lý task con — mô hình gần giống A2A (agent gọi agent), nhưng chạy nội bộ trong `apps/api` (chưa cần giao thức HTTP/JSON-RPC A2A thật, xem "Alternatives").

## Decision

**Agent thành entity riêng** (thay cho field string `agent` cũ trên `Conversation`):

```
Agent: id, slug (unique), name, description, system_prompt, model, is_orchestrator, created_at, updated_at
AgentDelegation: id, orchestrator_agent_id (FK agents.id), sub_agent_id (FK agents.id), UNIQUE(orchestrator_agent_id, sub_agent_id)
```

Quan hệ **many-to-many** qua `AgentDelegation` (không phải tree `parent_agent_id` đơn giản) — 1 sub-agent có thể được nhiều orchestrator gọi, giống mô hình discovery/capability của A2A hơn là cây phân cấp cứng.

`Conversation.agent` (string) đổi thành `Conversation.agent_id` (FK nullable → `agents.id`). `agent_id = NULL` → dùng agent mặc định hard-code (`DEFAULT_AGENT`, không phải DB row) cho conversation đơn giản không cần chọn agent.

**Thực thi**: dùng `langgraph.prebuilt.create_react_agent` cho MỌI agent (orchestrator và sub-agent) — khác biệt duy nhất là orchestrator có thêm tool `call_agent` cho mỗi sub-agent trong `AgentDelegation` của nó. Tool này chạy graph riêng của sub-agent (system_prompt/model của chính sub-agent đó), trả text kết quả làm tool result cho orchestrator tiếp tục xử lý.

## Consequences

- ✅ 1 orchestrator, nhiều sub-agent, user chỉ cần chat với orchestrator — đúng yêu cầu.
- ✅ Sub-agent tái dùng được giữa nhiều orchestrator (many-to-many).
- ✅ Dùng `create_react_agent` thống nhất cho cả orchestrator/sub-agent — không cần 2 code path riêng cho "có tool" vs "không tool".
- ⚠️ Bản đầu: sub-agent gọi bởi orchestrator KHÔNG được gọi tiếp sub-agent khác (chỉ 1 tầng). Đa tầng (sub-agent cũng là orchestrator của agent khác) để sau khi có nhu cầu thật — tránh vòng lặp gọi lẫn nhau (cycle) chưa có cơ chế chống ở bản đầu.
- ⚠️ Không có bảng `Task`/`AgentCard` kiểu A2A chuẩn ở bản đầu — tool `call_agent` là lời gọi Python trong process, không phải HTTP/JSON-RPC. Cần A2A thật (gọi agent ngoài, distributed) → ADR riêng khi có nhu cầu.

## Alternatives considered

- **Tree `parent_agent_id`**: loại — không tái dùng sub-agent giữa nhiều orchestrator được, user đã chọn many-to-many.
- **A2A protocol thật (JSON-RPC/HTTP, AgentCard, Task state machine)**: chưa cần — mọi agent chạy cùng process, chưa có agent bên ngoài để giao tiếp qua network. Cân nhắc lại khi cần gọi agent chạy ở service/máy khác.
