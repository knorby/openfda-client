# AGENTS.md

Instructions and steering for AI coding agents working in this repository.

This is `@knorby/openfda-client` — a fully-typed, zero-dependency
TypeScript client for the openFDA API (https://open.fda.gov/apis/). It
targets a universal runtime (Node, React Native, browsers, Bun, Deno) and
ships under Apache-2.0. Keep this file updated as conventions evolve.

**Unaffiliated-with-FDA disclaimer:** this library is a third-party client;
never present it as an FDA product. openFDA's own medical-care disclaimer
("Do not rely on openFDA to make decisions regarding medical care…") applies
to all data the client returns and is quoted in `README.md` and the
entry-point docs.

The client surface mirrors the openFDA API (every endpoint shares one query
surface: `search`/`count`/`limit`/`skip`/`sort`):

- `client.drug.{event,label,ndc,enforcement,drugsfda,orangebook,shortages}`,
  `client.food.{event,enforcement}`, `client.cosmetic.event` — typed
  namespaces (models in `src/types/drug|food|cosmetic.ts`), each exposing
  `search`, `count`, and `searchAll` (auto-pagination; stops at the API's
  25,000-record skip ceiling — bulk access belongs to the download files).
- `client.{device,tobacco,animalandveterinary,other,research,transparency}` —
  generic namespaces (`Record<string, unknown>` results; `device["510k"]`
  uses bracket access for the digit-leading key).
- `client.search("noun/endpoint")` / `client.count("noun/endpoint")` —
  generic escape hatch for **any** path, including endpoints FDA adds in the
  future; registered paths resolve typed models via `EndpointResultMap`.
- `client.search("x")` rejecting with `OpenFdaNotFoundError` is **API
  semantics**: openFDA answers zero-match searches with HTTP 404
  (`{"error":{"code":"NOT_FOUND"}}`), never an empty array. Do not
  "normalize" this away.
- `src/endpoints.ts` is the endpoint registry, seeded and verified by
  `scripts/discover-endpoints.mjs` against `https://api.fda.gov/download.json`
  + live probes. Two paths differ from the docs slugs: `device/pma` (not
  "premarketapproval") and `drug/shortages` (not "drugshortages").
- Search-syntax helpers live in `src/query.ts`
  (`and/or/not/field/exact/range/exists/term`).
- Drift protection: `tests/shapes/*.json` are skeleton snapshots of every
  endpoint; `scripts/capture-shapes.mjs` regenerates/diffs them (comparison is
  semantic, and the capture script reformats output with Biome after writing,
  so regenerated snapshots always pass `npm run lint`). The weekly
  `api-drift` GitHub workflow opens a review PR on drift — **never
  auto-merge drift PRs**; a human checks the diff against the field
  references. (Note: GitHub disables cron workflows after 60 days of repo
  inactivity; re-enable under Actions if the repo goes quiet.)

---

## Setup

### System requirements

Before installing git hooks, ensure the following are available on the
system:

1. **Node.js 24 (LTS)** — use [nvm](https://github.com/nvm-sh/nvm) or
   [fnm](https://github.com/Schniz/fnm); this repo includes an `.nvmrc`.
   (The published package supports Node 18+.)
2. **npm** — bundled with Node.
3. **pre-commit** — install via `pipx install pre-commit` or
   `brew install pre-commit`. Handles file hygiene + secret scanning.
4. **gitleaks** — install via `brew install gitleaks` or see
   <https://github.com/gitleaks/gitleaks>. The hook uses the
   system-installed binary (`gitleaks-system` hook ID) for lightweight
   regex-based secret scanning.
5. **Go toolchain** — required for the TruffleHog hook, which pre-commit
   builds from source in an isolated GOPATH on first run (slow; cached
   afterward). Install via `brew install go` or see <https://go.dev/dl/>.
6. **shellcheck** is **not** a system dependency — `shellcheck-py` ships its
   own bundled binary.

### Install dependencies and hooks

```bash
nvm use                  # or: fnm use
npm install              # installs deps (does NOT run prepare — see .npmrc)
npx husky                # set up Husky hooks (blocked by ignore-scripts)
pre-commit install       # wire pre-commit hooks into .git/hooks/
pre-commit run --all-files  # validate against the entire repo
```

`npm install` does **not** run the `prepare` script because `.npmrc` sets
`ignore-scripts=true` (supply-chain security — blocks dependency postinstall
scripts). Run `npx husky` separately to set up the Husky-managed hooks
(pre-commit → lint-staged, commit-msg → commitlint). `pre-commit install`
separately sets up the pre-commit-managed hooks (file hygiene + secret
scanning). Both are needed for full coverage.

### Adding and removing hooks

- **Prefer existing hooks.** Always check the pre-commit hooks index
  (<https://pre-commit.com/hooks.html>) and the featured repositories
  (<https://pre-commit.com/hooks.html#featured-hooks>) before writing a custom
  hook. Existing, maintained hooks are preferred over custom ones.
- **If no existing hook can satisfy a requirement**, flag this in your output
  and request input before adding a custom hook.
- **TypeScript linting/formatting** is handled by **Biome** via Husky +
  lint-staged (see `.husky/pre-commit`). Do not add a TS linter to
  `.pre-commit-config.yaml`; use Husky/lint-staged for that.
- **TruffleHog**: replaceable with another secret scanner if preferred. Both
  gitleaks and TruffleHog run in pre-commit. If CI-based secret scanning is
  also desired (e.g. to catch secrets when hooks are skipped), add a workflow
  in `.github/workflows/` and document it here.
- **Hook revisions** are pinned. Bump deliberately and review changelogs.
- Reference: <https://pre-commit.com/hooks.html>

---

## Development commands

| Command | What it does |
| --- | --- |
| `npm run build` | Build the package (tsup + tsc — dual ESM/CJS output with `.d.ts`/`.d.cts` declarations) |
| `npm run dev` | Build in watch mode |
| `npm run lint` | Lint + formatting check with Biome (read-only) |
| `npm run format` | Format with Biome (writes changes) |
| `npm run check` | Lint + format in one pass (writes changes) |
| `npm run typecheck` | Type-check `src/` + `tests/` with `tsc` (uses `tsconfig.test.json`, no emit) |
| `npm test` | Run tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage reporting |
| `npm run test:live` | Opt-in live smoke tests against the real openFDA API (`OPENFDA_LIVE_TESTS=1`) |
| `npm run drift:check` | Verify endpoint registry + shape snapshots against the live API |
| `npm run drift:capture` | Regenerate shape snapshots in `tests/shapes/` |
| `npx changeset` | Create a changeset (required for any change that affects published output) |

---

## Testing and CI

- Tests live in `tests/` and use **Vitest**. Add test files as
  `*.test.ts`. `tests/live.test.ts` is env-gated (`OPENFDA_LIVE_TESTS=1`)
  and skipped by default; it makes ~11 real API requests per run — keep
  that small and respect the rate limits.
- **GitHub Actions** runs the full check suite on every push to `main` and on
  PRs against `main` (see `.github/workflows/tests.yml`):
  - `npm run lint` (Biome — lint + formatting; formatting is enforced in CI,
    so run `npm run check` before committing if hooks are skipped)
  - `npm run typecheck` (tsc, src + tests)
  - `npm run build` (tsup)
  - `npm test` (Vitest)
  - `npm audit --audit-level=moderate` (vulnerability scan)
- The **pre-commit suite** (file hygiene + secret scanning) also runs in CI
  via `.github/workflows/pre-commit.yml` on every push to `main` and PRs
  against `main` (`pre-commit run --all-files --show-diff-on-failure` with
  `SKIP=no-commit-to-branch`, which would otherwise always fail on main pushes
  by design). The workflow installs a system gitleaks binary matching the rev
  in `.pre-commit-config.yaml`; the trufflehog golang hook uses the Go
  toolchain preinstalled on ubuntu-latest.
- The **openFDA API drift** workflow (`.github/workflows/api-drift.yml`)
  runs weekly on a schedule (plus manual `workflow_dispatch`): endpoint
  discovery, shape-snapshot diff, snapshot regeneration, live tripwire, then
  a drift PR (or an issue if live tests fail). Actions runners can use the
  optional `OPENFDA_API_KEY` secret for higher rate limits.
- Husky hooks (Biome + commitlint) remain local only.
- Optional security scanning additions (free for public repos): CodeQL
  (<https://github.com/github/codeql-action>), gitleaks-action
  (<https://github.com/gitleaks/gitleaks-action>), Semgrep
  (<https://github.com/returntocorp/semgrep-action>). Add workflows in
  `.github/workflows/` if desired and document it here.

---

## Versioning and publishing

This repo uses [Changesets](https://github.com/changesets/changesets) for
versioning. Versioning is **decoupled from merges** — you can merge multiple
PRs and release them all at once.

- **Before a PR that changes published output**: run `npx changeset`, select
  bump type (patch/minor/major), write a summary. Commit the generated
  `.changeset/*.md` file alongside the code change.
- **To release**: `npx changeset version` (bumps `package.json` +
  `CHANGELOG.md`), then `npm run release` (builds + publishes).
- **GitHub Actions release** (`workflow-templates/release.yml`): ships
  **staged** — GitHub only runs workflows from `.github/workflows/`, so this
  workflow is inert until moved
  (`git mv workflow-templates/release.yml .github/workflows/release.yml`).
  Once active, it runs on every push to `main` and publishes via OIDC
  trusted publishing (no npm token secrets involved); with no pending
  changesets it is a no-op. One-time setup (trusted publisher + GitHub
  environment) follows the checklist in `CONTRIBUTING.md`.
- **Always verify before publishing**: `npm run build && npm pack --dry-run`
  to confirm only `dist/`, `README.md`, `CHANGELOG.md`, and `LICENSE` are
  included.

### Publishing security

- **Trusted publishing (OIDC)** — the release workflow publishes with an OIDC
  token minted by GitHub Actions; there are no npm tokens involved (no
  `NPM_TOKEN` or `NODE_AUTH_TOKEN` secrets). The npm-side trusted-publisher
  config must match the workflow exactly. This is compatible with 2FA
  (`npm profile enable-2fa auth-and-writes`) because no token needs an OTP.
- **Provenance** — `publishConfig.provenance: true` in `package.json` enables
  npm provenance attestation (cryptographic link to commit + workflow).
  Provenance requires publishing from CI on a **public** repository.
- **Scoped names** — `@knorby/*` scoped names prevent dependency confusion
  attacks. Scoped packages default to restricted visibility, so
  `publishConfig.access: "public"` is set.
- **No secrets in published files** — the `files` field in `package.json`
  whitelists only `dist`, `README.md`, `CHANGELOG.md`, and `LICENSE`. Never
  add `src/`, `.env`, `tsconfig.json`, or other config to the `files` list.
- **`.npmrc`** — `ignore-scripts=true` blocks dependency `postinstall`
  scripts by default (supply-chain security). This also blocks this repo's
  own `prepare` script, so `npm install` will not auto-set-up Husky hooks —
  run `npx husky` after `npm install`, or use
  `npm install --ignore-scripts=false` to allow the prepare script.

---

## Guardrails and steering rules

These rules are mandatory. Follow them strictly.

### Git operations

- Do **not** perform git write operations — `commit`, `push`, `amend`, `tag`,
  create PRs — unless explicitly asked by the user.

### File removal

- `rm` is intentionally blocked in this environment. Do **not** attempt to
  bypass this restriction (no `find -delete`, `python -c "os.remove(...)"`,
  shell tricks, or alternative deletion methods).
- Use `git rm` for tracked files that need removal.
- If untracked files need removal, or if your action is required to remove
  something, **stop** and flag what needs to be removed and why in your
  output.

### Licensing

- Do **not** add a `LICENSE` file, license headers, or any licensing
  declarations without explicit user instruction.
- This applies broadly: build configs, package manifests (e.g. `license`
  fields in `package.json`, `pyproject.toml`, etc.), boilerplate, comments,
  and anywhere else a license might appear. Committing an unintentional
  license is not acceptable. If a license field is required by a tool's
  schema, leave it blank or omit it and flag it in your output for the user
  to decide.

### Disclaimers

- Keep the not-affiliated-with-FDA disclaimer and openFDA's medical-care
  disclaimer present and prominent in `README.md` and `src/index.ts` (and
  reuse them in generated docs). Never remove or weaken them.

### Documentation

- Keep `AGENTS.md` and `README.md` up to date as part of any change that
  affects setup, conventions, or project structure.
- Use the `docs/` directory for higher-level design notes, architecture, and
  decision records (ADRs). See `docs/README.md` for the ADR template.
- Treat `docs/` as living documentation. Create an ADR in `docs/decisions/`
  for significant design decisions.

### Before declaring done

- Run all quality gates:
  ```bash
  npm run lint && npm run typecheck && npm test && npm run build
  ```
- Verify that `npm pack --dry-run` includes only `dist/`, `README.md`,
  `CHANGELOG.md`, and `LICENSE` (no source, config, or secret files).
- Verify that `AGENTS.md` and `README.md` still reflect the current state of
  the repository.
