---
description: Draft a new ADR in docs/adr/ following this repo's exact format (AGENTS.md rule 3 — architecture decisions need an ADR before code)
argument-hint: <short description of the decision to record>
---

Draft a new ADR for: $ARGUMENTS

Delegate this to the `adr-writer` subagent — it already knows the numbering scheme, section
structure, and this repo's hard rules (no OpenJarvis dependency, no multi-tenant/RBAC, single-user
tool). Give it the decision context from this conversation so far (what problem forced the
decision, what was actually decided, what alternatives came up) — don't make it re-derive that from
scratch.

After it drafts the file, show the user the path and a summary, and ask whether Status should be
`proposed` or `accepted` if that wasn't already clear.
