# @knorby/openfda-client

A fully-typed, zero-dependency TypeScript client for the
[openFDA API](https://open.fda.gov/apis/) — search FDA public data on drugs,
devices, foods, cosmetics, tobacco, and more. Universal: works in Node,
React Native (Expo), browsers, Bun, and Deno — anywhere the standard Web
`fetch` is available.

> **Disclaimer:** This library is an independent, open-source project and is
> **not affiliated with, endorsed by, or sponsored by the U.S. Food and Drug
> Administration (FDA) or the U.S. Government**. "openFDA" is an FDA
> research project; this package is only a third-party API client for it.

- **Zero runtime dependencies** — built on the standard `fetch`, `Headers`,
  `AbortController`, and `Response` (all global in modern runtimes).
- **Every endpoint, one interface** — all openFDA endpoints share one query
  surface (`search` / `count` / `limit` / `skip` / `sort`), so every one of
  the 30 live endpoints is reachable through the same client — typed
  namespaces for the high-value ones, generic paths for everything else.
- **Fully typed where it matters** — drug (events, labels, NDC directory,
  Drugs@FDA, Orange Book, enforcement, shortages), food, and cosmetic
  endpoints ship with hand-written response models; every other endpoint is
  a caller-typable generic.
- **Auto-pagination** — `searchAll()` async iterators walk pages for you and
  respect the API's 25,000-record paging ceiling.
- **Predictable errors** — typed `OpenFdaApiError` / `OpenFdaTimeoutError`
  with parsed `Retry-After` on rate-limit (429) responses, and a dedicated
  `OpenFdaNotFoundError` for openFDA's distinctive "zero matches = 404"
  behavior.
- **Drift-resilient** — a scheduled GitHub Actions job diffs the client's
  endpoint registry and field-shape snapshots against the live API and opens
  a review PR when FDA changes something.

## Data and medical disclaimers

openFDA's own warning applies to **all data retrieved through this client**:

> Do not rely on openFDA to make decisions regarding medical care. While we
> make every effort to ensure that data is accurate, you should assume all
> results are unvalidated.

- **Not all openFDA data has been validated for clinical or production
  use.** Treat every result as unvalidated.
- **Adverse-event reports are voluntary.** Drug (FAERS), food, cosmetic, and
  device event reports do **not** establish causation, can be incomplete or
  inaccurate, and must not be used to estimate incidence.
- **Data is public domain** (CC0 1.0) unless otherwise noted on
  [open.fda.gov](https://open.fda.gov/license/). openFDA asks (but does not
  require) attribution: *"Data provided by the U.S. Food and Drug
  Administration (https://open.fda.gov)"*.
- Some device data includes GMDN® content licensed from The GMDN Agency,
  which carries its own usage restrictions — see the
  [openFDA terms](https://open.fda.gov/terms/).

## Install

```bash
npm install @knorby/openfda-client
```

## Quick start

```ts
import { OpenFdaClient } from "@knorby/openfda-client";

// No API key needed (240 req/min, 1,000 req/day per IP);
// a free key raises this to 120,000 req/day.
const client = new OpenFdaClient({
  // apiKey: process.env.OPENFDA_API_KEY,
});

// Typed namespaces for the priority endpoints
const labels = await client.drug.label.search({
  search: 'openfda.brand_name:"advil"',
  limit: 5,
});

// Facet counts (unique values of a field)
const reactions = await client.drug.event.count({
  count: "patient.reaction.reactionmeddrapt.exact",
});

// Lazily iterate every matching record across pages (stops at the 25k cap)
for await (const recall of client.food.enforcement.searchAll({
  search: "status:Ongoing",
})) {
  console.log(recall.recalling_firm, recall.reason_for_recall);
}
```

### Composing searches

Search expressions are openFDA's Elasticsearch-style syntax. Build them with
the bundled helpers instead of hand-escaping:

```ts
import { and, exact, field, range } from "@knorby/openfda-client";

const search = and(
  exact("openfda.brand_name", "ADVIL"),
  range("receivedate", { gte: "20240101", lte: "20241231" }),
);
// 'openfda.brand_name.exact:ADVIL AND receivedate:[20240101 TO 20241231]'

const events = await client.drug.event.search({ search, limit: 10 });
```

### Every endpoint, even untyped ones

All nine live API nouns are exposed as namespaces (`client.drug`,
`client.food`, `client.cosmetic`, `client.device`, `client.tobacco`,
`client.animalandveterinary`, `client.other`, `client.research`,
`client.transparency`). Untyped endpoints surface generic records:

```ts
const cls = await client.device.classification.search({ limit: 1 });
cls.results[0]?.device_name; // typed models land as FDA data stabilizes

// Any endpoint — including brand-new ones FDA hasn't announced — via the
// generic path methods (new endpoints work without a client release):
const crl = await client.search("transparency/crl", { limit: 1 });
const byUdi = await client.device["510k"].search({ limit: 1 }); // digit-leading keys use bracket access
```

### Zero matches is a 404

openFDA reports a search with **zero matching records as HTTP 404**
(`{"error":{"code":"NOT_FOUND"}}`), not as an empty array. The client
surfaces this as a typed error you can catch:

```ts
import { OpenFdaNotFoundError } from "@knorby/openfda-client";

try {
  await client.drug.label.search({ search: 'openfda.brand_name:"nope"' });
} catch (err) {
  if (err instanceof OpenFdaNotFoundError) {
    // treat as "no matches" (e.g. resolve to [])
  } else {
    throw err;
  }
}
```

## Universal runtime notes

The client uses the global `fetch` (and `Headers` / `AbortController` /
`Response`), which is native in:

| Runtime        | Available since          |
| -------------- | ------------------------ |
| Node.js        | 18                       |
| Browsers       | Evergreen                |
| React Native   | 0.73+ (fetch polyfill)   |
| Bun / Deno     | All                      |

For tests or older runtimes, inject a custom `fetch`:

```ts
const client = new OpenFdaClient({ fetch: (url, init) => myFetchImpl(url, init) });
```

## Endpoint coverage

| Namespace member                  | Dataset                                  | Typed model |
| --------------------------------- | ---------------------------------------- | ----------- |
| `client.drug.event`               | Drug adverse events (FAERS)              | `DrugEvent` |
| `client.drug.label`               | Structured product labeling              | `DrugLabel` |
| `client.drug.ndc`                 | NDC directory                            | `DrugNdc`   |
| `client.drug.enforcement`         | Drug recall enforcement reports          | `DrugEnforcement` |
| `client.drug.drugsfda`            | Drugs@FDA applications                   | `DrugsFda`  |
| `client.drug.orangebook`          | Orange Book approvals                    | `DrugOrangeBook` |
| `client.drug.shortages`           | Drug shortages                           | `DrugShortage` |
| `client.food.event`               | Food adverse events                      | `FoodEvent` |
| `client.food.enforcement`         | Food recall enforcement reports          | `FoodEnforcement` |
| `client.cosmetic.event`           | Cosmetic adverse events                  | `CosmeticEvent` |
| `client.device.*` (9 endpoints)   | 510(k)s, PMA, classification, events, recalls, registration & listing, UDI, COVID-19 serology | generic |
| `client.tobacco.*` (4 endpoints)  | Problem reports + research datasets      | generic     |
| `client.animalandveterinary.event`| Animal-drug adverse events               | generic     |
| `client.other.nsde`, `.historicaldocument` | NSDE, historical documents | generic |
| `client.other.substance`             | GSRS substance records                   | `Substance` |
| `client.other.unii`                  | UNII substance-name crosswalk            | `UniiRecord` |
| `client.research.covidmirnaandproteomics` | COVID-19 miRNA/proteomics        | generic     |
| `client.transparency.crl`         | Complete Response Letters                | generic     |

Every endpoint object exposes `search(params)`, `count(params)`, and
`searchAll(params, pageSize?)`. Generic access works for all paths via
`client.search("noun/endpoint", …)`.

## Rate limits and authentication

| Mode          | Rate limit                        |
| ------------- | --------------------------------- |
| No API key    | 240 requests/min · 1,000 requests/day (per IP) |
| Free API key  | 240 requests/min · 120,000 requests/day (per key) |

Request a free key at [open.fda.gov](https://open.fda.gov/apis/authentication/)
and pass it via `new OpenFdaClient({ apiKey })`. The key is appended as the
`api_key` query parameter and **redacted from every error** this client
produces. On 429 responses, `OpenFdaApiError.retryAfterSeconds` carries the
server's recommended back-off.

The client can also retry 429s for you — opt in with
`new OpenFdaClient({ retryOn429: true })` (or `{ retryOn429: { maxRetries: n } }`).
It honors `Retry-After` (capped at 60s) and otherwise backs off
exponentially; see [ADR-0004](docs/decisions/0004-opt-in-429-retry.md).

### Paging limit

`skip` maxes out at 25,000 (with `limit` ≤ 1,000), so search pagination
covers ~26,000 records per query. `searchAll()` stops there automatically
and documents it; for bulk access use the official
[download files](https://open.fda.gov/data/downloads/).

## Known API quirks

These `other/substance` (GSRS) search behaviors were mapped through live
probing during development. They are openFDA-side behaviors — openFDA's own
documentation does not call them out — and knowing them saves real
debugging time:

- **`names.name` searches can dead-end.** A value you can see in a
  record's `names[].name` may still return `404 NOT_FOUND` when searched
  as `names.name:<value>` (indexing/tokenization varies across records).
  A 404 here does not prove the record doesn't exist.
- **`other/unii` is the dependable crosswalk.** For substance-name ↔ UNII
  resolution, query `client.other.unii` (`UniiRecord`:
  `substance_name`/`unii`) instead of searching substance names.
- **`.exact` fails on nested `name_orgs` fields.** Queries like
  `names.name_orgs.name_org.exact:…` return `404 NOT_FOUND`. Drop the
  `.exact` modifier on nested name-organization fields.
- **Some `names.name` + `name_orgs` combinations return HTTP 500.**
  Certain `names.name:… AND names.name_orgs.…` queries fail with a bare
  server error rather than a structured error code. Narrow the name
  query first, and test each clause on its own before combining.

As everywhere in openFDA, a zero-match search surfaces as
`404 NOT_FOUND` — see [Zero matches is a 404](#zero-matches-is-a-404).

## Keeping up with the API

`scripts/discover-endpoints.mjs` diffs the client's endpoint registry
against the live API manifest, and `scripts/capture-shapes.mjs` snapshots
every endpoint's field skeleton into `tests/shapes/` — together with
`npm run test:live` these run weekly in the **openFDA API drift** workflow,
which opens a review PR when FDA adds, removes, or reshapes anything. Run
them yourself with `npm run drift:check`.

## Development

See [AGENTS.md](AGENTS.md) for repository conventions and
[CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

```bash
npm install     # does not run prepare (see .npmrc)
npx husky       # set up git hooks
pre-commit install
npm test        # unit tests (no network)
npm run test:live  # opt-in live smoke tests
npm run drift:check # verify endpoint registry + shape snapshots
```

## License

[Apache-2.0](LICENSE) © Kali Norby ([@knorby](https://github.com/knorby))

This project is unaffiliated with the FDA; openFDA data is public domain
(CC0 1.0) unless otherwise noted.
