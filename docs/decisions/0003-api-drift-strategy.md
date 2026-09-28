# ADR-0003: openFDA API drift strategy

- **Status:** Accepted
- **Date:** 2026-09-23
- **Deciders:** knorby (via planning session)

## Context

openFDA is a live, evolving API:

- It publishes **no machine-readable field schemas** (`/fields.json`-style
  resources do not exist). The field references are HTML pages generated
  from the openFDA docs, which can drift from what the API actually returns.
- The endpoint inventory is **not fixed**: datasets appear (e.g.
  `transparency/crl`, `tobacco/research*`, `other/unii` all postdate the
  original API) and paths sometimes differ from the docs slugs
  (`device/pma` vs. "premarketapproval", `drug/shortages` vs.
  "drugshortages").
- Field sets inside records change over time as FDA adds or retires fields.

The client promises full coverage of every endpoint with a low-maintenance
maintenance model (no runtime dependencies, hand-written priority models).

## Decision

Three complementary mechanisms, ordered by leverage:

1. **Generic path escape hatch (architectural).** `client.search(path)` and
   `client.count(path)` accept *any* `"noun/endpoint"` string, not just
   registry members. A brand-new endpoint is usable on day one without a
   client release; typed namespaces are conveniences, never gates.

2. **Manifest + probe discovery (`scripts/discover-endpoints.mjs`).** The
   machine-readable `download.json` manifest enumerates candidate
   noun/endpoint pairs; each candidate is probed live to confirm it is a
   real search endpoint. The script diffs live reality against the
   committed `ENDPOINTS` registry (`NEW`/`GONE`/`OK`). With
   `--fail-on-diff`, status 2 signals confirmed drift; an unavailable,
   rate-limited, or inconclusive probe exits 1 instead of marking a
   registered endpoint gone.

3. **Sample-based shape snapshots (`scripts/capture-shapes.mjs`).** Since
   no schema source exists, drift detection samples a few records per
   endpoint and records the *skeleton* (sorted keys + scalar kinds, no
   values) in `tests/shapes/*.json`. A regenerated capture that differs
   from the committed snapshot means: added fields (typed models going
   stale), removed/retyped fields (possible breaking change), or new/lost
   endpoints. Snapshots double as living documentation for the ~20
   endpoints without hand-written models.

These run together in the scheduled **api-drift workflow**
(`.github/workflows/api-drift.yml`, weekly cron + manual dispatch): discovery
report → shape diff → snapshot regeneration on drift → live test tripwire → a
review PR via SHA-pinned `peter-evans/create-pull-request` only on confirmed
drift, or an issue when the live tripwire fails. Probe failures stop the
workflow; no diagnostic report is committed on routine runs.

## Consequences

- **Human adjudication, no auto-merge.** Drift PRs collect evidence; a
  maintainer decides whether typed models need updating. FDA occasionally
  changes things in ways a bot cannot adjudicate.
- **GitHub disables cron workflows after 60 days of repository
  inactivity.** This workflow's own PR/issue traffic usually keeps the repo
  active, but it may need a manual "re-enable" after a quiet period.
- **Additive drift is tolerated at runtime.** All model fields are optional
  and the client never strips or validates unknown fields, so new API fields
  flow through harmlessly; snapshots catch them so the *types* stay
  worthwhile.
- **Snapshot noise.** Rare fields may appear/disappear in snapshots if the
  sampled records happen to include them; the sampled-record count (5) and
  shape merging keep this manageable. Snapshot changes should be reviewed
  with the field references in hand.
- **Keyless budget.** The drift run makes ~35 requests + ~11 live-test
  requests per week — comfortably inside the 1,000/day keyless limit;
  `OPENFDA_API_KEY` can be added as a repository secret if desired.
