---
"@knorby/openfda-client": minor
---

Correct observed openFDA field types for drug shortages, Orange Book records,
label harmonization, adverse-event country, and count facets. Accept `limit` on
count requests; support explicit custom result types on `client.search<T>()`;
escape literal search terms; and expose the runtime `OpenFdaRequester` needed by
the public `createEndpoint` helper.
