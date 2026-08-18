# ADR-0002 — ORM: SQLAlchemy 2.0 + Alembic

- **Status**: accepted
- **Date**: 2026-08-18

## Context

`apps/api` (FastAPI, [ADR-0001](0001-single-python-runtime.md)) cần lớp truy cập dữ liệu cho `conversations`/`messages`/`tool_calls` trên PostgreSQL ([ADR-0003](0003-db-postgres-pgvector.md)).

## Decision

Dùng **SQLAlchemy 2.0** (declarative, typed) + **Alembic** cho migration — tương đương vai trò Prisma ở convention TypeScript cũ:

- Model khai báo ở `app/modules/<feature>/models.py`, kế thừa 1 `Base` chung (`app/db/base.py`).
- Truy cập DB qua session inject (FastAPI `Depends(get_session)`), tách riêng `repository.py` (query) khỏi `service.py` (business logic) — tương đương `PrismaService` inject nhưng có thêm 1 lớp repository rõ ràng.
- Migration: `alembic revision --autogenerate -m "<desc>"`, `alembic upgrade head`.

## Consequences

- ✅ Type-safe với SQLAlchemy 2.0 (Mapped[...] annotation), Alembic migration rõ ràng.
- ✅ Tách repository/service cho phép mock DB dễ khi test service logic.
- ⚠️ Không tự động generate type như Prisma — cần tự viết Pydantic schema map từ model (ở `schemas.py`).

## Alternatives considered

- **Prisma (qua prisma-client-py)**: loại — hỗ trợ Python không chính thức/kém ổn định bằng bản TS.
- **Tortoise ORM**: nhẹ hơn, async-native, nhưng ecosystem/migration tooling (Aerich) kém trưởng thành hơn Alembic.
