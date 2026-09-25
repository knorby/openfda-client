# docs/

Living documentation for design, architecture, and decisions.

## Structure

- `decisions/` — Architecture Decision Records (ADRs). Create a new markdown
  file per significant decision, using the template below.

## Decisions

- [ADR-0001: Generic endpoint core with priority-typed namespaces](decisions/0001-generic-endpoint-core.md)
- [ADR-0002: Split build — tsup bundles, tsc declarations, import-path fix](decisions/0002-ts7-declaration-split.md)
- [ADR-0003: openFDA API drift strategy](decisions/0003-api-drift-strategy.md)
- [ADR-0004: Opt-in 429 retry honoring Retry-After](decisions/0004-opt-in-429-retry.md)

## ADR template

```markdown
# ADR-NNNN: <Title>

- **Status:** Proposed | Accepted | Superseded by ADR-MMMM | Deprecated
- **Date:** YYYY-MM-DD

## Context

Why is this decision needed? What forces are at play?

## Decision

What was decided?

## Consequences

What are the trade-offs, risks, and follow-up actions?
```

Number ADRs sequentially (`ADR-0001`, `ADR-0002`, ...). Keep each record concise
and factual; supersede rather than rewrite accepted records.
