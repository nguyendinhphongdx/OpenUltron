---
name: ultron-conventions
description: Load Ultron's actual architecture decisions and backend/frontend conventions before writing or reviewing code in this repo. Use before any non-trivial change to apps/api or apps/web, before proposing a new dependency/library/schema change, or whenever you're about to guess a convention instead of checking one. Triggers on "add a module", "new endpoint", "new entity", "which ORM/library", "is this allowed", "add multi-tenant/RBAC", or any FastAPI/SQLAlchemy/LangGraph decision in this repo.
---

# Ultron conventions

This repo (Ultron) has already made most of the decisions a general FastAPI/Next.js instinct would
guess differently. Before writing code, check the actual source of truth instead of assuming:

| Question | Read this, not general knowledge |
|---|---|
| "What's the current state / what's next?" | `docs/roadmap/README.md` — read this first, every session |
| "How should this module be laid out?" | `docs/conventions/01-backend-fastapi.md` (apps/api) or `docs/conventions/02-frontend-nextjs.md` (apps/web) |
| "Why was X chosen over Y?" | `docs/adr/*.md` — one file per accepted decision |
| "What are the domain entities?" | `docs/domain/01-entities.md` |
| "Is this a hard rule or a suggestion?" | `AGENTS.md` (root) — "Quy tắc cứng" section |

## Non-negotiable rules (AGENTS.md) — check these before finishing ANY task here

1. **No OpenJarvis dependency.** `../OpenJarvis` is reference-only for design ideas. Importing it,
   calling into its process, or copying its code verbatim violates ADR-0001. Referencing its
   *patterns* in a comment or design discussion is fine; `import openjarvis` or a subprocess/HTTP
   call to it is not.
2. **No scope creep.** Don't implement beyond what was asked or what an accepted ADR already
   covers. Missing spec → ask, or draft an ADR (see the `adr-writer` subagent / `/new-adr` command)
   — don't guess and build.
3. **Architecture decisions need an ADR before code**, not after. Swapping ORM/DB/agent-execution
   library, adding multi-tenant concepts, changing the persistence model of an existing entity —
   all of these are ADR-first. `docs/adr/0001`–`0007` already cover: single Python runtime,
   SQLAlchemy, Postgres+pgvector, Pydantic v2, LangGraph execution, multi-agent org chart
   (orchestrator + `AgentDelegation`, 1 tier deep), and the Model/Tool/KnowledgeBase/Settings
   resource split. Read the relevant one before assuming how something works.
4. **Convention docs are canonical over general framework knowledge.** If `docs/conventions/`
   describes something differently than how FastAPI/NestJS "usually" do it, the doc wins — or gets
   updated first, but code doesn't quietly diverge from it.
5. **Never commit secrets.** Provider API keys (Gemini/OpenAI) come from `.env` / env vars only,
   never stored in a DB row (see ADR-0007's explicit reasoning about not encrypting secrets at
   rest for a single-user app).
6. **Ultron is single-user.** Do not add multi-tenant, workspace, or RBAC concepts unless a future
   ADR explicitly changes this.

## apps/api layering, in one line each

`router.py` (HTTP↔service dispatch, no logic) → `service.py` (business logic, raises
`HTTPException`, depends on other modules' **Services** never their **Repositories** — enforced by
`apps/api/scripts/check_module_boundaries.py`) → `repository.py` (SQLAlchemy query only) →
`models.py` (SQLAlchemy 2.0 `Mapped[...]`). `schemas.py` has `Create`/`Update` (own `BaseModel`,
optional fields, `Update` does NOT inherit `Create`)/`Read`. Dependencies are wired via
`Depends(get_x_service)` composition in `deps.py`, not manual repository construction inside a
service that needs another module's data.

## Before calling a backend task done

Run (or ask the `api-reviewer` subagent to run) the actual harness — this is not optional politeness,
these checks are what CI/pre-commit will run anyway:

```bash
cd apps/api
uv run ruff check .
uv run ruff format --check .
uv run python scripts/check_module_boundaries.py
uv run pytest -q
```

If you're unsure whether something is a "real" architectural decision needing an ADR versus a
routine implementation detail: if it changes what's stored, how agents call each other, or what
library/service the code depends on, it's a decision — draft the ADR first.
