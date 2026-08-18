# ADR-0005 — Agent execution: LangGraph, tool tự viết (tham khảo pattern OpenJarvis)

- **Status**: accepted
- **Date**: 2026-08-18 (revised — bỏ phần "OpenJarvis làm tool-library", xem [ADR-0001](0001-single-python-runtime.md))

## Context

Cần agent execution có checkpoint/resume, human-in-the-loop approval (duyệt trước khi chạy lệnh trên máy qua `claude_code_runner`-style tool), branching giữa các loại task (chat, research, code-task). Tool/connector tự viết mới trong Ultron ([ADR-0001](0001-single-python-runtime.md)), không import OpenJarvis.

## Decision

Dùng **LangGraph** làm lớp agent execution (`app/modules/agent/`):

- Node/tool tự viết trong `apps/api`, **tham khảo pattern registry/connector của OpenJarvis** khi thiết kế (không import code).
- Graph state lưu qua LangGraph checkpointer (Postgres, [ADR-0003](0003-db-postgres-pgvector.md)) — resume conversation sau khi API restart.
- Node "approval" tạm dừng graph, chờ user duyệt qua API trước khi node tiếp theo (vd chạy lệnh trên máy) thực thi.

## Consequences

- ✅ Approval flow, checkpoint/resume, branching có sẵn từ LangGraph.
- ✅ Tool viết đúng convention Ultron ngay từ đầu (không phải bọc lại code viết cho CLI).
- ⚠️ Phải tự viết từng tool (GitHub search/read, MCP client cho Jira/Confluence, tool chạy lệnh máy cục bộ...) — chưa có sẵn, ưu tiên theo roadmap.

## Alternatives considered

- **CrewAI / AutoGen**: chưa xét kỹ — LangGraph được chọn vì kiểm soát graph tường minh (node/edge) hợp với nhu cầu approval-gate rõ ràng hơn multi-agent "tự thảo luận".
