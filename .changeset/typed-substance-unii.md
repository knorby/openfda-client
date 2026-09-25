---
"@knorby/openfda-client": minor
---

Add typed models for the `other/substance` and `other/unii` endpoints.
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
