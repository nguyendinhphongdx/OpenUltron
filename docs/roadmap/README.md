# Roadmap

> Đọc đầu mỗi session — biết đang ở đâu, làm tiếp gì.

## Đã xong

- [x] Monorepo skeleton (pnpm + turbo cho apps/web/mobile/desktop; apps/api là project Python riêng)
- [x] ADR-0001..0005 (single Python runtime, SQLAlchemy, Postgres+pgvector, Pydantic, LangGraph — tự viết toàn bộ, OpenJarvis chỉ tham khảo)
- [x] `apps/api` skeleton: FastAPI + SQLAlchemy (Postgres/pgvector) + Pydantic, module `conversation` (+ sub-resource `message`, `tool_call`), health check

## Đang làm / tiếp theo

- [ ] `uv sync` + `alembic upgrade head` cho `apps/api`, verify chạy được
- [ ] `app/modules/agent/` — LangGraph graph đầu tiên (chat đơn giản, chưa tool)
- [ ] Tool tự viết (tham khảo pattern OpenJarvis, không import): GitHub search/read, MCP client (Jira/Confluence), tool chạy lệnh trên máy (có approval gate)
- [ ] `apps/web` — Next.js, theo convention `docs/conventions/02-frontend-nextjs.md` (chưa viết — copy/adapt từ `muong-kho-api` khi bắt đầu)
- [ ] `apps/mobile` — Expo (React Native)
- [ ] `apps/desktop` — Tauri
- [ ] Streaming: `apps/api` → client (SSE)
- [ ] Channel điện thoại: chọn 1 trong Telegram/WhatsApp làm kênh chính

## Chưa quyết (cần ADR trước khi code)

- Có port tiếp connector nào của OpenJarvis sang viết mới không, thứ tự ưu tiên connector.
- Cơ chế đồng hồ thông minh (không có tích hợp native — có thể phải qua app điện thoại trung gian).
