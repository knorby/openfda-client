---
"@knorby/openfda-client": patch
---

Fix `not()` to parenthesize compound clauses. `not(or(a, b))` now renders
`NOT (a OR b)`; previously it rendered `NOT a OR b`, which Elasticsearch
parses as `(NOT a) OR b` — inverting the intended negation.
