# @knorby/openfda-client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@knorby/openfda-client` — a zero-dependency, universal-runtime TypeScript client wrapping the entire openFDA API (~26+ endpoints) with typed priority endpoints (drug/food/cosmetic), a generic escape hatch, and a scheduled drift-detection job.

**Architecture:** One `OpenFdaRequester` (fetch-based, ported from `nih-dsld-client`) + a static endpoint registry + factory-built `{ search, count, searchAll }` endpoint clients. Priority endpoints get hand-written response models bound via an `EndpointResultMap`; everything else resolves to `Record<string, unknown>` (caller-overridable generic). Drift resilience = `download.json` manifest diff + sample-based shape snapshots + weekly GitHub Actions PR-opener.

**Tech Stack:** TypeScript 7, tsup (dual ESM/CJS), Biome, Vitest, Changesets, GitHub Actions. Zero runtime dependencies. Reference implementation to port from: `/Users/knorby/code/nih-dsld-client/` (read it first).

**Spec:** This document is self-contained — all decisions below are final.

## Global Constraints

- **Zero runtime dependencies**, forever. Web-standard `fetch`/`Headers`/`AbortController`/`Response` only. Universal runtime: Node 18+, React Native/Expo, browsers, Bun, Deno.
- **Commit permission is granted** (user's words). Conventional commits, one per task. **Never push.**
- Package name `@knorby/openfda-client`, version stays `0.0.0` + one `minor` changeset. No `"private"` field (user chose publish-ready).
- **Disclaimers are mandatory deliverables** (README + TSDoc on `OpenFdaClient`): not affiliated with/endorsed by the FDA or US Government; verbatim openFDA meta disclaimer *"Do not rely on openFDA to make decisions regarding medical care. While we make every effort to ensure that data is accurate, you should assume all results are unvalidated."*; data not validated for clinical/production use; adverse-event reports are voluntary and do not establish causation; data is CC0 public domain with requested attribution *"Data provided by the U.S. Food and Drug Administration (https://open.fda.gov)"*.
- 404 with `error.code === "NOT_FOUND"` (zero matches) → `OpenFdaNotFoundError extends OpenFdaApiError` — **never** normalize to empty results (user decision).
- `skip` max 25000 / `limit` max 1000 — `searchAll` stops at the cap, TSDoc points to openFDA download files for bulk.
- `rm` is blocked in this environment; use `git rm` for tracked files, flag untracked removals in output.
- Verification gate before finishing: `npm run check && npm run typecheck && npm test && npm run build && npm pack --dry-run` (pack must list only `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`).
- GitHub Actions rules: latest action majors (verified 2026-09-23: `actions/checkout@v7`, `actions/setup-node@v7`, `peter-evans/create-pull-request@v8.1.1` pinned to SHA `5f6978faf089d4d20b00c7766989d076bb2fc7f1`), least-privilege top-level `permissions`, `timeout-minutes` on every job, no untrusted interpolation in `run:` blocks, third-party actions SHA-pinned.

## API facts (verified 2026-09-23)

- Base `https://api.fda.gov/{noun}/{endpoint}.json`; params `search`, `sort` (`field:asc|desc`), `count`, `limit` (≤1000), `skip` (≤25000). Response envelope `{ meta: { disclaimer, terms, license, last_updated, results?: { skip, limit, total } }, results: [...] }`; count queries return `results: [{ term, count }]`.
- Auth: `api_key` query param. Keyless: 240 req/min + 1,000/day per IP. Keyed: 240/min + 120,000/day.
- Zero matches → HTTP 404 `{"error":{"code":"NOT_FOUND","message":"No matches found!"}}`.
- Endpoint inventory: **docs list** — `drug`: event, label, ndc, enforcement, orangebook, drugsfda, drugshortages · `food`: event, enforcement · `cosmetic`: event · `device`: 510k, classification, covid19serology, enforcement, event, premarketapproval, recall, registrationlisting, udi · `tobacco`: problem · `animalandveterinary`: event · `other`: historicaldocument, nsde, substance. **`download.json` additionally lists** (probe before including): `other/unii`, `research/covidmirnaandproteomics`, `transparency/crl`, `tobacco/researchdigitalads`, `tobacco/researchpreventionads`, `tobacco/researchsmokefree`.
- No machine-readable field schemas (`/fields.json` → 404) → drift detection is sample-based, not schema-based.

---

### Task 0: Template tuning

**Files:** Modify `package.json`, `tsup.config.ts`; Create `scripts/fix-declaration-imports.mjs`; Create plan file `docs/superpowers/plans/2026-09-23-openfda-client.md`

- [ ] **Step 1:** Save this plan document (above).
- [ ] **Step 2:** `package.json`: `name: "@knorby/openfda-client"`; `description: "A fully-typed, zero-dependency TypeScript client for the openFDA API. Universal: Node, React Native, browsers, Bun, and Deno."`; add `keywords: ["openfda","fda","drug","food","cosmetic","adverse-events","api","client","typescript","react-native","universal"]`; add `repository`/`homepage`/`bugs` → `github.com/knorby/openfda-client`; add scripts `"test:live": "OPENFDA_LIVE_TESTS=1 vitest run tests/live.test.ts"`, `"drift:check": "node scripts/discover-endpoints.mjs && node scripts/capture-shapes.mjs --check"`, `"drift:capture": "node scripts/capture-shapes.mjs"`, `"prepack": "npm run build"`; update `build` to `tsup && tsc --emitDeclarationOnly && node scripts/fix-declaration-imports.mjs && node -e "require('fs').copyFileSync('dist/index.d.ts','dist/index.d.cts')"`. Keep `publishConfig` as-is.
- [ ] **Step 3:** Copy `scripts/fix-declaration-imports.mjs` **verbatim** from `/Users/knorby/code/nih-dsld-client/scripts/fix-declaration-imports.mjs` (rewrites extensionless `.d.ts` relative imports to `.js` for Node16 resolution).
- [ ] **Step 4:** `tsup.config.ts`: add the `PKG_VERSION` define block — copy the full file from `/Users/knorby/code/nih-dsld-client/tsup.config.ts` verbatim.
- [ ] **Step 5:** Verify: `npm install && npm run build` produces `dist/index.js`, `index.cjs`, `index.d.ts`, `index.d.cts`.
- [ ] **Step 6:** Commit `chore: tune template for @knorby/openfda-client`.

### Task 1: Error hierarchy

**Files:** Create `src/errors.ts`, `tests/errors.test.ts`
**Interfaces — Produces:** `OpenFdaError`, `OpenFdaTimeoutError { timeoutMs }`, `OpenFdaApiError { status, body, retryAfterSeconds?, url, code? }`, `OpenFdaNotFoundError extends OpenFdaApiError`, `OpenFdaNetworkError { url }` — all consumed by Task 2.

- [ ] **Step 1:** Port `/Users/knorby/code/nih-dsld-client/src/errors.ts` verbatim with renames `Dsld*→OpenFda*`, `DSLD→openFDA`. Deltas: `OpenFdaApiError` gains optional `code?: string` (parsed from the API's `{"error":{"code",...}}` body) and the constructor accepts it; add `OpenFdaNotFoundError extends OpenFdaApiError` (`name = "OpenFdaNotFoundError"`, message `"openFDA: no matches found for {url}"`).
- [ ] **Step 2:** Write `tests/errors.test.ts` first: instanceof chain (`OpenFdaNotFoundError` instanceof both `OpenFdaApiError` and `OpenFdaError`), `code` propagation, `retryAfterSeconds` message suffix, prototype-chain survival (`err instanceof OpenFdaError` after throw/catch).
- [ ] **Step 3:** Run tests → fail → implement → pass.
- [ ] **Step 4:** Commit `feat: openfda error hierarchy`.

### Task 2: HTTP requester + serialization

**Files:** Create `src/constants.ts`, `src/utils/serialize.ts`, `src/http.ts`, `tests/http.test.ts`, `tests/serialize.test.ts`
**Interfaces — Consumes:** Task 1 errors. **Produces:** `DEFAULT_BASE_URL="https://api.fda.gov"`, `DEFAULT_TIMEOUT_MS=30000`, `MAX_LIMIT=1000`, `MAX_SKIP=25000`, `DEFAULT_PAGE_SIZE=100`; `buildQueryString`, `mergeParams`, `QueryRecord`; `FetchLike`, `OpenFdaClientConfig { baseUrl?, apiKey?, timeoutMs?, fetch?, headers?, userAgent? }`, `OpenFdaRequester { get<TR>(path, params?): Promise<TR> }`.

- [ ] **Step 1:** Port `src/utils/serialize.ts` from dsld (drop `barcodeVariants`/`wrapBarcode`/`groupBarcode` and the paginate helper — pagination moves to Task 4 against the openFDA envelope). Port `tests/serialize.test.ts` to match.
- [ ] **Step 2:** Port `src/http.ts` from dsld with renames + deltas: (a) default base URL from `constants`; (b) user-agent `@knorby/openfda-client/${PKG_VERSION}`; (c) in `parseBody`, for non-2xx first attempt `JSON.parse(bodyText)` — if it yields `{ error: { code: "NOT_FOUND" } }` and status is 404, throw `OpenFdaNotFoundError`; attach parsed `code` to all `OpenFdaApiError`s; (d) api_key query-param append + redaction exactly as dsld.
- [ ] **Step 3:** Write `tests/http.test.ts` (mock `fetch` via config; model on `/Users/knorby/code/nih-dsld-client/tests/client.test.ts` requester cases): URL+param building; `api_key` appended when configured; redaction in `OpenFdaApiError.url` and `OpenFdaNetworkError.url`; timeout → `OpenFdaTimeoutError`; 404 NOT_FOUND body → `OpenFdaNotFoundError` with `code`; 429 with `Retry-After: 17` → `retryAfterSeconds: 17`; non-JSON 2xx → `OpenFdaError`; thrown `TypeError` from fetch → `OpenFdaNetworkError`; missing global fetch → constructor throws `OpenFdaError`.
- [ ] **Step 4:** Red → green. Commit `feat: fetch-based requester with typed errors`.

### Task 3: Endpoint discovery + registry

**Files:** Create `scripts/discover-endpoints.mjs`, `src/endpoints.ts`, `tests/endpoints.test.ts`; Create `tests/shapes/.gitkeep`
**Interfaces — Produces:** `ENDPOINTS` (`as const`, noun → readonly endpoint array), `Noun`, `EndpointPath` (`` `${Noun}/${string}` ``), `ALL_PATHS: readonly EndpointPath[]`. Consumed by Tasks 4, 9.

- [ ] **Step 1:** Write `scripts/discover-endpoints.mjs` (zero-dep Node, `.mjs`): fetch `https://api.fda.gov/download.json` (plus `?api_key=` if `OPENFDA_API_KEY` env set), walk `results` noun→endpoint keys, probe each `GET {base}/{noun}/{endpoint}.json?limit=1` spaced 300 ms — **alive** iff 2xx with a `meta` key in the JSON body (a 404 body means missing-or-empty; log body for manual adjudication); read `src/endpoints.ts` as text and check each alive path appears in it; print `NEW`/`GONE`/`OK` report; `--fail-on-diff` exits 1 on any NEW/GONE.
- [ ] **Step 2:** Run it once with a handwritten candidate registry (docs list + the six download-only candidates from "API facts"); seed `ENDPOINTS` from probe results — expected: docs list confirmed, plus whichever of `other/unii`, `research/covidmirnaandproteomics`, `transparency/crl`, `tobacco/research*` probe alive. Record the outcome in the commit message.
- [ ] **Step 3:** `tests/endpoints.test.ts`: every noun has ≥1 endpoint; all paths match `/^[a-z0-9]+\/[a-z0-9]+$/`; `ALL_PATHS` has no duplicates; priority paths (`drug/event`, `drug/label`, `drug/ndc`, `drug/enforcement`, `drug/drugsfda`, `drug/orangebook`, `drug/drugshortages`, `food/event`, `food/enforcement`, `cosmetic/event`) are present.
- [ ] **Step 4:** Commit `feat: endpoint registry + discovery script`.

### Task 4: Endpoint factory, client, pagination

**Files:** Create `src/types/common.ts`, `src/client.ts`, `tests/client.test.ts`
**Interfaces — Consumes:** Tasks 1–3. **Produces:**
```ts
export interface OpenFdaMeta { disclaimer: string; terms: string; license: string; last_updated: string; results?: { skip: number; limit: number; total: number }; }
export interface OpenFdaResponse<T> { meta: OpenFdaMeta; results: T[]; }
export interface CountResult { term: string; count: number; }
export interface SearchParams { search?: string; sort?: string; limit?: number; skip?: number; }
export interface CountParams { search?: string; count: string; }
export interface EndpointClient<T> {
  search(params?: SearchParams): Promise<OpenFdaResponse<T>>;
  count(params: CountParams): Promise<OpenFdaResponse<CountResult>>;
  searchAll(params?: Omit<SearchParams, "skip" | "limit">, pageSize?: number): AsyncGenerator<T>;
}
export class OpenFdaClient {
  constructor(config?: OpenFdaClientConfig);
  search<P extends string>(path: P, params?: SearchParams): Promise<OpenFdaResponse<ResultFor<P>>>;
  count(path: string, params: CountParams): Promise<OpenFdaResponse<CountResult>>;
  readonly drug: { event: EndpointClient<DrugEvent>; label: EndpointClient<DrugLabel>; ndc: EndpointClient<DrugNdc>; enforcement: EndpointClient<DrugEnforcement>; orangebook: EndpointClient<DrugOrangeBook>; drugsfda: EndpointClient<DrugsFda>; drugshortages: EndpointClient<DrugShortage> };
  readonly food: { event: EndpointClient<FoodEvent>; enforcement: EndpointClient<FoodEnforcement> };
  readonly cosmetic: { event: EndpointClient<CosmeticEvent> };
  readonly device /* …, tobacco, animalandveterinary, other, + any discovered nouns */: Record<string, EndpointClient<Record<string, unknown>>>;
}
```
(`ResultFor` and model types land in Task 5; in this task use a placeholder map that Task 5 fills — keep `search<P>` generic signature stable.)

- [ ] **Step 1:** `tests/client.test.ts` (mocked fetch): `client.drug.label.search({ search: "x", limit: 5 })` → GETs `/drug/label.json?search=x&limit=5`; `count` requires `count` param and sends it; generic `client.search("device/udi", …)` hits the right URL; `searchAll` yields across two pages then stops on short page; `searchAll` clamps pageSize to 1000; `searchAll` stops when `skip` would exceed 25000; `device["510k"]` key works (bracket access — digit-leading name).
- [ ] **Step 2:** Red → implement `types/common.ts` + `client.ts` (endpoint factory + explicit namespace construction over `ENDPOINTS`; paginate generator: `limit = min(pageSize ?? 100, 1000)`, stop on short page, on `seen >= meta.results.total`, or when next `skip` > `MAX_SKIP`) → green.
- [ ] **Step 3:** Commit `feat: generic client with endpoint namespaces and pagination`.

### Task 5: Priority response models

**Files:** Create `src/types/openfda.ts` (shared harmonized sub-record), `src/types/drug.ts`, `src/types/food.ts`, `src/types/cosmetic.ts`; Modify `src/client.ts` (wire `EndpointResultMap`); Create `tests/types.test.ts`
**Interfaces — Produces:** `OpenFdaHarmonized` (the shared `openfda` sub-record: `application_number?`, `brand_name?`, `generic_name?`, `manufacturer_name?`, `product_ndc?`, `product_type?`, `route?`, `substance_name?`, `rxcui?`, `spl_id?`, `spl_set_id?`, `package_ndc?`, `unii?`, `pharm_class_epc?`/`moa?`/`pe?`/`cs?`, `is_original_packager?` — all `string[] | undefined` except flags); the ten model types named in Task 4; `EndpointResultMap` + `ResultFor<P extends string> = P extends keyof EndpointResultMap ? EndpointResultMap[P] : Record<string, unknown>`.

- [ ] **Step 1:** Author models from the official field references (`https://open.fda.gov/apis/drug/{event,label,ndc,enforcement,orangebook,drugsfda,drugshortages}/`, `/apis/food/{event,enforcement}/`, `/apis/cosmetic/event/` — fetch each `searchable-fields` page). Rules: every field optional (openFDA omits empties); documented nested objects/arrays get interfaces (e.g. `DrugEvent.patient.drug[]`, `patient.reaction[]`, `DrugLabel` sections as `string[]`); unknown extras tolerated (no closed index signatures that would fight the API).
- [ ] **Step 2:** `tests/types.test.ts`: compile-time fixtures — a realistic `DrugLabel` object literal assigns to the type (typecheck proves shape); `ResultFor<"drug/label">` resolves to `DrugLabel`; `ResultFor<"device/udi">` resolves to `Record<string, unknown>`; a caller-supplied generic `client.search<DeviceUdi>("device/udi")` overrides.
- [ ] **Step 3:** `npm run typecheck` green. Commit `feat: typed models for drug, food, and cosmetic endpoints`.

### Task 6: Search query builder

**Files:** Create `src/query.ts`, `tests/query.test.ts`
**Interfaces — Produces:** `term(value: string): string` (quotes when value contains whitespace/colon, escapes `"`); `field(f, v)`, `exact(f, v)` (`.exact` suffix), `and(...clauses)`, `or(...clauses)`, `not(clause)`, `range(f, { gte?, lte? })` → `f:[a TO b]` (`*` for open ends), `exists(f)` → `_exists_:f`. All return openFDA `search`-syntax strings with spaces (serializer handles encoding).

- [ ] **Step 1:** Tests first: `and(field("openfda.brand_name","lipitor"), range("receivedate",{gte:"20200101"}))` → `'openfda.brand_name:lipitor AND receivedate:[20200101 TO *]'`; quoting/escaping cases; single-clause `and(x)` → `x`; empty `and()` throws `RangeError`.
- [ ] **Step 2:** Red → green. Commit `feat: search query builder`.

### Task 7: Public export surface

**Files:** Modify `src/index.ts`; Create `tests/index.test.ts`
- [ ] **Step 1:** Export everything per dsld `src/index.ts` style: client + params types, config/errors, constants, all `types/*`, query builder, `ENDPOINTS`/`ALL_PATHS`/`EndpointPath`, serialize utils. Test asserts the expected named exports exist and `new OpenFdaClient()` constructs with injected mock fetch.
- [ ] **Step 2:** Commit `feat: public api surface`.

### Task 8: Live tests

**Files:** Create `tests/live.test.ts`
- [ ] **Step 1:** Env-gated (`OPENFDA_LIVE_TESTS=1`, optional `OPENFDA_API_KEY`), `limit: 1` calls, modeled on `/Users/knorby/code/nih-dsld-client/tests/live.test.ts`: drug label search returns `meta.last_updated` + 1 result with `openfda`; drug event `count` on `patient.reaction.reactionmeddrapt.exact` returns `{term, count}[]`; food event, food enforcement, cosmetic event, ndc, drugsfda each return results; a nonsense search (`search: "openfda.brand_name:zzz_no_such_drug_zzz"`) rejects with `OpenFdaNotFoundError`; `searchAll` over `drug/enforcement` with `pageSize: 2` yields ≥3 records across pages.
- [ ] **Step 2:** Run `npm run test:live` once to verify (respect rate limits — this is ~10 requests). If the sandbox has no network, document that and proceed.
- [ ] **Step 3:** Commit `test: env-gated live smoke tests`.

### Task 9: Drift resilience + scheduled workflow

**Files:** Create `scripts/capture-shapes.mjs`, `tests/shapes/*.json` (generated), `.github/workflows/api-drift.yml`, `docs/decisions/0003-api-drift-strategy.md`
- [ ] **Step 1:** `scripts/capture-shapes.mjs`: for each `ALL_PATHS`, GET `?limit=5` (300 ms spacing, `api_key` if env), reduce records to a shape tree — object: sorted child keys; array: `[elementShape]`; scalar: `"string"|"number"|"boolean"` — write `tests/shapes/{noun}.{endpoint}.json`. `--check` regenerates in memory, diffs, prints added/removed/changed paths, exits 1 on any diff.
- [ ] **Step 2:** Run capture once; commit snapshots.
- [ ] **Step 3:** `.github/workflows/api-drift.yml`:
```yaml
name: openFDA API drift

on:
  schedule:
    - cron: "17 6 * * 1"   # weekly Mon 06:17 UTC (off the top of the hour)
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write
  issues: write

concurrency:
  group: api-drift
  cancel-in-progress: false

jobs:
  drift:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: ".nvmrc"
          cache: npm
      - run: npm ci
      - name: Discover endpoints + capture shapes
        env:
          OPENFDA_API_KEY: ${{ secrets.OPENFDA_API_KEY }}
        run: |
          node scripts/discover-endpoints.mjs > drift-report.txt || true
          node scripts/capture-shapes.mjs >> drift-report.txt
      - name: Live tripwire tests
        id: live
        env:
          OPENFDA_LIVE_TESTS: "1"
          OPENFDA_API_KEY: ${{ secrets.OPENFDA_API_KEY }}
        run: npm run test:live
      - name: Open drift PR
        if: success()
        uses: peter-evans/create-pull-request@5f6978faf089d4d20b00c7766989d076bb2fc7f1 # v8.1.1
        with:
          title: "chore: openFDA API drift detected"
          body-path: drift-report.txt
          branch: bot/openfda-drift
          commit-message: "chore: refresh endpoint shapes after openFDA drift"
      - name: Open issue on tripwire failure
        if: failure() && steps.live.outcome == 'failure'
        env:
          GH_TOKEN: ${{ github.token }}
          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: gh issue create --title "openFDA live tripwire failing" --body "Scheduled live tests failed: $RUN_URL" --label drift
```
- [ ] **Step 4:** ADR-0003: manifest-diff + sample snapshots + generic escape hatch; records the GitHub **60-day cron deactivation** caveat and the no-auto-merge rule.
- [ ] **Step 5:** Commit `feat: api drift detection and scheduled workflow`.

### Task 10: Docs, disclaimers, changeset, final gate

**Files:** Rewrite `README.md`, `AGENTS.md`; Create `docs/decisions/0001-generic-endpoint-core.md`, `docs/decisions/0002-ts7-declaration-split.md`; Create one changeset
- [ ] **Step 1:** README (model structure on `/Users/knorby/code/nih-dsld-client/README.md`): install, quick start (`new OpenFdaClient()`, drug label search, count, `searchAll`, query builder, generic `client.search("device/udi")`, `device["510k"]` note), universal-runtime table, error handling incl. `OpenFdaNotFoundError` for zero matches, rate limits + free API key, 25k pagination cap → download files, **Disclaimers section with all Global-Constraints disclaimers verbatim**, license.
- [ ] **Step 2:** AGENTS.md from the dsld AGENTS.md base (keeps its Licensing guardrail section): project intro, client surface summary, the 404 quirk, 25k cap, `test:live` / `drift:check` commands, drift-job notes (60-day caveat).
- [ ] **Step 3:** ADR-0001 (generic core + `EndpointResultMap` + priority typing), ADR-0002 (tsc declaration emit + `fix-declaration-imports.mjs` for TS 7).
- [ ] **Step 4:** `npx changeset` → `minor` → "Initial release: full openFDA API client (drug/food/cosmetic typed, all endpoints via generic interface)".
- [ ] **Step 5:** Final gate: `npm run check && npm run typecheck && npm test && npm run build && npm pack --dry-run` — verify pack whitelist. Commit `docs: readme, agents, decision records` and the changeset in the same or a follow-up `chore: add initial changeset`.

## Self-review (completed at planning time)

- **Spec coverage:** search wrap ✓ (T4), drug/food/cosmetic priority ✓ (T5), all endpoints ✓ (T3/T4 generic), zero-dep/universal ✓ (T2), disclaimers ✓ (T10), template tuning ✓ (T0), commit permission ✓ (global), drift job ✓ (T9).
- **Placeholders:** priority-model field lists are intentionally sourced from the live field-reference pages at execution time (T5 Step 1 names the exact URLs and authoring rules) — no invented schemas.
- **Type consistency:** `ResultFor` introduced T4, bound T5 — signatures match; `EndpointClient<T>` stable T4→T10.
