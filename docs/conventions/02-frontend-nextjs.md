# Frontend convention — Next.js (`apps/web`)

Canonical — `apps/web/CLAUDE.md` chỉ trỏ về đây. Scaffold ban đầu adapt từ một Next.js console nội bộ khác (feature-folder layering + react-query pattern) — bỏ phần tenant/workspace/session-refresh vì Ultron [là công cụ 1 người dùng](../../AGENTS.md), chưa có auth ở `apps/api`.

## Mục đích

Web console — chat với agent (orchestrator + sub-agent) và quản lý agent org chart ([ADR-0006](../adr/0006-multi-agent-org-chart.md)). Gọi thẳng `apps/api`, không qua gateway.

## Convention

- **Next.js** (`output: 'standalone'`) — deploy riêng khỏi `apps/api`. Chưa dùng Server Components/API routes (`app/api/*`) — mọi logic vẫn gọi `apps/api` qua fetch client-side (`'use client'` cho component fetch/tương tác).
- **Feature-folder layering** (`src/features/<name>/`): `types/ → services/ → hooks/ → components/`, mỗi tầng chỉ import tầng dưới nó, có barrel `index.ts`. Xem `src/features/conversation/` làm mẫu.
  - `types/` — type request/response khớp `apps/api/app/modules/**/schemas.py`. Đổi shape ở BE → sửa ở đây trước, không để service/component tự đoán field.
  - `services/` — gọi `apiClient` (từ `@/lib/api`), map response, không chứa React.
  - `hooks/` — `@tanstack/react-query` (`useQuery`/`useMutation`) wrap service.
  - `components/` — UI, dùng Tailwind + primitive ở `src/components/ui/` (shadcn-style, `cva` + `@radix-ui/react-slot`).
- `src/lib/api/endpoints.ts` là nơi duy nhất khai path — service không hardcode string URL rải rác.
- `NEXT_PUBLIC_*` đọc **runtime** qua `next-runtime-env` (`src/constants/env.ts` + `<PublicEnvScript />` ở `app/layout.tsx`) — KHÔNG bake lúc build.

## Anti-pattern

- ❌ Thêm tenant/workspace/session-refresh/multi-locale khi chưa có ADR quyết định khác — vi phạm [rule #6](../../AGENTS.md).
- ❌ Gọi thẳng DB hoặc chứa business rule ở đây — luôn qua API `apps/api`.
- ❌ Viết lại type FE tay theo trí nhớ — đối chiếu `apps/api/app/modules/**/schemas.py` trước.
- ❌ Đọc `process.env.NEXT_PUBLIC_*` trực tiếp — dùng `ENV` từ `src/constants/env.ts`.
