---
description: Run the full Ultron check suite (same as pre-commit/CI) and report pass/fail
---

Run these, in order, and report a clear pass/fail summary at the end — don't just dump raw output:

```bash
cd apps/api
uv run ruff check .
uv run ruff format --check .
uv run python scripts/check_module_boundaries.py
uv run pytest -q   # exit 5 ("no tests collected") is expected until tests/ exists — not a failure
cd ../..
pnpm --filter @ultron/web lint
pnpm --filter @ultron/web typecheck
pnpm --filter @ultron/web build
```

If anything fails, show the relevant error and stop there rather than continuing through the rest —
fix-then-rerun is more useful than a full log of cascading failures. Do not fix issues automatically
unless the user asks; report first.
