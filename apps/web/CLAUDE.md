# CLAUDE.md — apps/web

## Mục đích

Web console cho Ultron (chat với agent, quản lý agent org chart). Không gọi thẳng DB — mọi request đi qua `apps/api`.

## Convention

Chi tiết đầy đủ → **[`docs/conventions/02-frontend-nextjs.md`](../../docs/conventions/02-frontend-nextjs.md)** — canonical, đọc file đó trước khi thêm/sửa feature. File này chỉ giữ note riêng của package.

Xem `src/features/conversation/` làm mẫu layering `types → services → hooks → components`.

## Lệnh

```bash
pnpm --filter @ultron/web dev
pnpm --filter @ultron/web build
pnpm --filter @ultron/web typecheck
pnpm --filter @ultron/web lint
```
