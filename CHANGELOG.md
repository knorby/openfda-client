# Changelog

## 0.1.0

### Minor Changes

- 59544a8: Correct observed openFDA field types for drug shortages, Orange Book records,
  label harmonization, adverse-event country, and count facets. Accept `limit` on
  count requests; support explicit custom result types on `client.search<T>()`;
  escape literal search terms; and expose the runtime `OpenFdaRequester` needed by
  the public `createEndpoint` helper.
- 2f4e304: Initial release: full openFDA API client. All 30 live endpoints across nine
  nouns via typed namespaces (`drug`, `food`, `cosmetic` fully typed) and
  generic `client.search`/`client.count` path access; `searchAll` auto-
  pagination with the 25,000-record skip ceiling handled; `OpenFdaNotFoundError`
  for openFDA's zero-match-404 semantics; search-syntax builder
  (`and/or/not/field/exact/range/exists/term`); weekly API-drift detection.
  Zero runtime dependencies; universal runtime (Node 18+, React Native,
  browsers, Bun, Deno). Not affiliated with or endorsed by the FDA.
- 8b46e07: Add an opt-in `retryOn429` client option for automatic rate-limit
  retries: `true` retries up to 3 times, `{ maxRetries: n }` overrides the
  count. Waits honor the `Retry-After` header (capped at 60 seconds) and
  fall back to exponential backoff otherwise; `timeoutMs` applies per
  attempt. Off by default — see ADR-0004.
- 8b46e07: Add typed models for the `other/substance` and `other/unii` endpoints.
  `client.other.substance` now resolves to `Substance` (GSRS record: names
  with `name_orgs`/`domains`, codes, references, relationships; deep GSRS
  sections such as `structure` remain opaque pass-throughs) and
  `client.other.unii` to `UniiRecord` (`substance_name`, `unii` — the
  substance-name ↔ UNII crosswalk). Both paths also resolve through
  `EndpointResultMap` for `client.search("other/…")`. Types are authored
  from the API shape snapshots; field presence varies by record, so every
  field is optional.
  
  Also documents the `other/substance` search quirks (`names.name`
  dead-ends, `.exact` on nested `name_orgs` fields, `names.name` AND
  `name_orgs` 500s, `other/unii` as the crosswalk) in a new README
  "Known API quirks" section.

### Patch Changes

- d9af574: Consolidate disclaimers: `README.md` is now the single home for the
  not-affiliated-with-FDA notice and openFDA's medical-care disclaimer.
  Removed the duplicated `@disclaimer` TSDoc blocks from source files
  (only one-line pointers remain on the entry surfaces), so declaration
  output shrinks accordingly.
- 8b46e07: `searchAll` now validates `pageSize` eagerly, throwing `RangeError` at
  call time instead of lazily on the generator's first `next()`.
- 8b46e07: Fix `not()` to parenthesize compound clauses. `not(or(a, b))` now renders
  `NOT (a OR b)`; previously it rendered `NOT a OR b`, which Elasticsearch
  parses as `(NOT a) OR b` — inverting the intended negation.
- 59544a8: Prevent configured API keys from appearing in client-generated error bodies and
  network causes, and reject invalid 429 retry counts rather than silently
  disabling or retrying without a finite bound.

<!-- Changesets generates entries below this line. Do not edit manually. -->
