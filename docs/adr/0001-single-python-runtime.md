# ADR-0001 — Single Python runtime: FastAPI + LangGraph, tự viết toàn bộ (OpenJarvis chỉ tham khảo)

- **Status**: superseded x2 (bản 1: hybrid Node+Python; bản 2: OpenJarvis làm tool-library) → accepted (bản này)
- **Date**: 2026-08-18 (revised lần 2)

## Context

Bản 1 ADR này đề xuất `apps/api` (NestJS) gọi HTTP sang OpenJarvis. Bản 2 đổi sang 1 runtime Python, import trực tiếp OpenJarvis làm tool-library. Sau khi cân nhắc lại: **Ultron tự viết toàn bộ code**, không phụ thuộc package/runtime OpenJarvis — OpenJarvis (và cmc-agent-platform, OpenClaw) chỉ dùng làm **tài liệu tham khảo** khi thiết kế (đọc cách họ làm registry pattern, MCP client, connector, security scanner...), không import, không vendor, không fork.

## Decision

**1 runtime Python duy nhất**, code 100% tự viết trong `apps/api`:

- **FastAPI** — HTTP layer (router/service/repository/schema).
- **LangGraph** — agent execution (graph/checkpoint/human-in-the-loop), xem [ADR-0005](0005-langgraph-agent-execution.md).
- **Tool/connector/MCP client/security scanner** — tự viết mới trong `apps/api` (hoặc package riêng sau này), **tham khảo pattern từ OpenJarvis** (registry decorator, cấu trúc connector, MCP client wrapper) nhưng KHÔNG import `openjarvis` package, KHÔNG gọi sang process/service OpenJarvis.

```
apps/mobile ─┐
apps/web    ─┼─▶ apps/api (FastAPI + LangGraph, Python — tự viết toàn bộ)
apps/desktop─┘
```

> OpenJarvis (`D:\Code\Pers\OpenJarvis`) vẫn nằm đó làm tài liệu tham khảo code khi cần (vd xem cách họ viết `ToolRegistry`, MCP client, connector GitHub) — không phải dependency của Ultron.

## Consequences

- ✅ 1 codebase, không phụ thuộc runtime/package ngoài do người khác (kể cả code cũ của chính mình ở OpenJarvis) — toàn quyền kiểm soát convention, không kế thừa nợ kỹ thuật/thiết kế cũ.
- ✅ Tự do thiết kế tool/connector/MCP đúng theo convention Ultron ngay từ đầu, không phải "bọc lại" code viết cho ngữ cảnh CLI khác.
- ⚠️ **Phải viết lại từ đầu** những gì OpenJarvis đã có (tool registry, MCP client, connector GitHub/Gmail/..., security scanner, `claude_code_runner`) — mất thời gian hơn tái dùng trực tiếp, đổi lại toàn quyền kiểm soát.
- ⚠️ Ưu tiên viết trước theo nhu cầu thực tế (roadmap), không cố port toàn bộ ~30 channel/connector của OpenJarvis ngay — chỉ làm phần cần cho use case hiện tại (GitHub, Jira/Confluence qua MCP, code trên máy, Telegram/WhatsApp).

## Alternatives considered

- **Import OpenJarvis làm tool-library** (bản 2 ADR này): loại theo yêu cầu — muốn tự làm hết, không phụ thuộc runtime cũ.
- **Hybrid NestJS + Python service qua HTTP** (bản 1): loại — thêm phức tạp vận hành không cần thiết.
