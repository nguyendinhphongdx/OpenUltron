# ADR-0004 — Validation: Pydantic v2

- **Status**: accepted
- **Date**: 2026-08-18 (revised — bản đầu chọn Zod/nestjs-zod cho stack TypeScript)

## Context

`apps/api` giờ là FastAPI ([ADR-0001](0001-single-python-runtime.md)), không còn NestJS — Zod/nestjs-zod không áp dụng được.

## Decision

Dùng **Pydantic v2** (chuẩn FastAPI):

- Schema request/response ở `app/modules/<feature>/schemas.py`.
- `Update` schema kế thừa `Create` với field optional (tương đương `.partial()` bên Zod).
- FastAPI tự validate qua type hint (`Body(...)`, response_model) — không cần pipe riêng như `ZodValidationPipe`.

## Consequences

- ✅ Chuẩn FastAPI, không thêm dependency lạ.
- ✅ Tích hợp OpenAPI/Swagger tự động từ schema.

## Alternatives considered

Không xét lại — Pydantic là lựa chọn mặc định/chuẩn của FastAPI.
