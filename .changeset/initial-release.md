---
"@knorby/openfda-client": minor
---

Initial release: full openFDA API client. All 30 live endpoints across nine
nouns via typed namespaces (`drug`, `food`, `cosmetic` fully typed) and
generic `client.search`/`client.count` path access; `searchAll` auto-
pagination with the 25,000-record skip ceiling handled; `OpenFdaNotFoundError`
for openFDA's zero-match-404 semantics; search-syntax builder
(`and/or/not/field/exact/range/exists/term`); weekly API-drift detection.
Zero runtime dependencies; universal runtime (Node 18+, React Native,
browsers, Bun, Deno). Not affiliated with or endorsed by the FDA.
