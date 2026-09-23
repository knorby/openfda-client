# ADR-0001: Generic endpoint core with priority-typed namespaces

- **Status:** Accepted
- **Date:** 2026-09-23

## Context

openFDA is a single Elasticsearch-backed API where every endpoint shares one
query surface (`search`, `count`, `limit`, `skip`, `sort`) and one response
envelope (`{ meta, results }`). There are 30 live endpoints across 9 nouns;
new ones appear over time. Hand-maintaining 30 bespoke method signatures
would be high-churn, while a purely untyped client would waste openFDA's
most valuable property for editor-assisted development: stable, documented
field sets on the drug/food/cosmetic datasets.

## Decision

- One generic core: `OpenFdaRequester` + `createEndpoint(path)` producing a
  `{ search, count, searchAll }` trio per path.
- **Priority typing**: hand-written response models for the ten
  drug/food/cosmetic endpoints (`src/types/{drug,food,cosmetic}.ts`), bound
  through `EndpointResultMap` (path string → model) and resolved by
  `ResultFor<P>`; untyped paths resolve to `Record<string, unknown>` and are
  caller-overridable with an explicit generic.
- **Generic escape hatch**: `client.search(path)` / `client.count(path)`
  accept any `"noun/endpoint"` string — new FDA endpoints work without a
  client release.
- All model fields are optional (openFDA omits empty fields) and unknown
  fields are never stripped, so additive API changes never break consumers.

## Consequences

- New endpoints need no code (generic paths) and gain autocomplete only
  after a registry + optional model update.
- `EndpointResultMap` entries are additive; removing one is a
  semver-minor-level narrowing, reviewed via drift PRs.
- Typed namespaces must be updated manually when `ENDPOINTS` changes; the
  drift workflow flags registry/model divergence.
