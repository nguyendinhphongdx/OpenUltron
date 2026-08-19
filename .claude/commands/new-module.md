---
description: Scaffold a new apps/api module (model/schemas/repository/service/router/deps) following this repo's exact layering convention
argument-hint: <module_name singular snake_case> <one-line purpose>
---

Scaffold a new module at `apps/api/app/modules/$1/` for: $ARGUMENTS

Before writing anything, read `apps/api/app/modules/model/` in full (models.py, schemas.py,
repository.py, service.py, router.py, deps.py) — it's the cleanest example of the convention in
this repo (single-table CRUD, no cross-module dependency) and your scaffold must match its shape
exactly, not a generic FastAPI tutorial pattern. Also skim
`docs/conventions/01-backend-fastapi.md` for the naming table and anti-patterns.

Files to create, in this order:

1. **`models.py`** — SQLAlchemy 2.0 `Mapped[...]` style, inherits `Base` from `app/db/base.py`.
   `id`/`created_at`/`updated_at` on every table (see existing modules for the exact column defs).
   Use `JSONB().with_variant(JSON, "sqlite")` for any JSON column, not a bare `JSON`.
2. **`schemas.py`** — `<Feature>Create`, `<Feature>Update` (own `BaseModel`, all fields optional —
   do NOT make it inherit `Create`), `<Feature>Read`.
3. **`repository.py`** — query only (`select`/`insert`/`update` via SQLAlchemy), no
   `HTTPException`, no business logic. Constructor takes `session: AsyncSession`.
4. **`service.py`** — business logic, raises `HTTPException`. If it needs to reference another
   module's resource (an FK to check), its constructor takes that module's **Service** (never its
   Repository) — see `apps/api/app/modules/tool/service.py` for the pattern (`agent_service:
   AgentService`, using `.find()` for a non-throwing check or `.get_or_404()` when the reference
   must exist). This is enforced by `apps/api/scripts/check_module_boundaries.py` — a cross-module
   repository import will fail CI/pre-commit, not just look wrong in review.
5. **`router.py`** — FastAPI router, prefix plural (`/<features>`), no business logic, just
   dispatch to service.
6. **`deps.py`** — `get_<feature>_service()` composed via `Depends(get_x_service)` for any
   dependency services (not manual repository construction) — see `apps/api/app/modules/tool/deps.py`
   or `apps/api/app/modules/settings/deps.py` for the composed-dependency pattern.

Then:

- Register the new router in `apps/api/app/main.py` (import + `app.include_router(...)`).
- Generate the migration: `cd apps/api && uv run alembic revision --autogenerate -m "add <feature>"`,
  then read the generated file before applying — autogenerate is not always correct — then
  `uv run alembic upgrade head`.
- Run `/check` (or the equivalent commands) before calling it done.
- If this module represents an architectural decision not already covered by an ADR (new entity
  relationship, new external dependency, etc.), stop and use `/new-adr` first — don't scaffold
  ahead of the decision (AGENTS.md rule 3).
