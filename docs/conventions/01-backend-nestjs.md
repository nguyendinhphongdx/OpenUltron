# Convention — Backend NestJS (`apps/api`)

> Canonical convention cho code trong `apps/api/src/`. Kế thừa từ `muong-kho-api/docs/conventions/01-backend-nestjs.md`, bỏ phần multi-tenant (workspace scoping) vì Ultron là công cụ 1 người dùng.
> ORM = **Prisma** ([ADR-0002](../adr/0002-orm-prisma.md)). DB = **SQLite** ([ADR-0003](../adr/0003-db-sqlite-local-first.md)).

## Folder layout

Mỗi domain nghiệp vụ = 1 module folder, đặt theo feature (không theo type).

```text
apps/api/src/
├── main.ts                     # Bootstrap HTTP
├── app.module.ts                # Root module
├── common/                      # Cross-cutting: filters, interceptors, dto (pagination)
├── config/                      # Env schema validation (Zod)
├── prisma/                      # PrismaService (NestJS module bọc Prisma Client)
└── modules/
    └── conversation/            # Aggregate root: conversation + message + tool-call
        ├── conversation.module.ts
        ├── conversation.controller.ts
        ├── conversation.service.ts
        ├── dto/conversation.schema.ts
        ├── message/              # Sub-resource — nested route dưới conversation
        │   ├── message.controller.ts
        │   ├── message.service.ts
        │   └── dto/message.schema.ts
        └── tool-call/             # Sub-resource — nested route dưới message
            ├── tool-call.controller.ts
            ├── tool-call.service.ts
            └── dto/tool-call.schema.ts

apps/api/prisma/
└── schema.prisma                # Model + migration source (Prisma)
```

> Khi tạo module mới: `nest g resource modules/<feature>` rồi chỉnh theo convention dưới.

## Module / Controller / Service

Giữ nguyên rule từ `muong-kho-api`:

- Controller chỉ điều phối HTTP ↔ service, **KHÔNG** business logic. Route prefix số nhiều: `@Controller('conversations')`.
- Service chứa business logic, throw domain exception (`NotFoundException`...), không trả raw HTTP shape.
- Sub-resource (message, tool-call) không gọi trực tiếp Prisma của module khác — nếu cần, inject service đã export.

## DTO & validation

- **Zod** qua `nestjs-zod` ([ADR-0004](../adr/0004-validation-zod.md)). Schema ở `dto/*.schema.ts`, type qua `z.infer`.
- `update` schema = `create.partial()`.

## Persistence — Prisma + SQLite

- Truy cập DB qua `PrismaService` (inject), không dùng Prisma Client global.
- Migration: `pnpm --filter @ultron/api prisma:migrate` (dev), `prisma:deploy` (prod).
- **Không multi-tenant** — không có `workspaceId`/`RequestContextService`. Nếu sau này cần multi-user thật, mở ADR mới trước khi thêm.
- Cột JSON (`metadata`, `arguments`, `result`) lưu dạng `String` (SQLite không có `Json` type ổn định) — service layer tự `JSON.stringify`/`JSON.parse`, không rải raw string ở controller.

## Error handling

- Throw `HttpException` (hoặc subclass) từ service.
- 1 global exception filter ở `common/filters/all-exceptions.filter.ts` chuẩn hoá response: `{ statusCode, error, message, timestamp, path }`.

## Naming

| Loại          | Quy ước       | Ví dụ                     |
| ------------- | ------------- | -------------------------- |
| File          | kebab-case    | `create-message.schema.ts` |
| Class         | PascalCase    | `ConversationService`      |
| Module folder | singular kebab| `modules/conversation/`    |
| Route path    | plural        | `conversations`            |
| Var / method  | camelCase     | `findByChannel`            |
| DB column     | camelCase     | `externalUserId` (Prisma default, khác `muong-kho-api` dùng snake_case — SQLite 1 process, không cần khớp BA ngoài) |
| Env var       | UPPER_SNAKE   | `DATABASE_URL`             |

## Anti-pattern

- ❌ Business logic trong controller.
- ❌ Prisma Client global thay vì `PrismaService` inject.
- ❌ Thêm multi-tenant/`workspaceId` mà không có ADR trước.
- ❌ Đổi DB/ORM mà không có ADR.

## Self-check trước khi xong

- [ ] Module đăng ký vào `app.module.ts`?
- [ ] Controller không chứa business logic?
- [ ] DTO Zod validate input, không duplicate type?
- [ ] `pnpm --filter @ultron/api typecheck && lint && test` xanh?
- [ ] Quyết định kiến trúc mới → có ADR?
