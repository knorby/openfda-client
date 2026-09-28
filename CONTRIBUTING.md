# Contributing

Thanks for contributing! This guide covers getting set up, the development
workflow, and how to publish releases.

## Prerequisites

- **Node.js 24+** (use [nvm](https://github.com/nvm-sh/nvm) or
  [fnm](https://github.com/Schniz/fnm); this repo includes an `.nvmrc`)
- **npm** (bundled with Node)
- **pre-commit** — `pipx install pre-commit` or `brew install pre-commit`
- **gitleaks** — `brew install gitleaks` (secret scanner for pre-commit)
- **Go toolchain** — `brew install go` (required once for the TruffleHog hook
  build)

## Getting started

```bash
git clone <repo-url>
cd <repo-name>
nvm use              # or: fnm use
npm install          # installs deps (prepare blocked by .npmrc ignore-scripts)
npx husky            # sets up Husky hooks (run after npm install)
pre-commit run --all-files # optional initial full-repo validation
```

## Development commands

| Command | What it does |
| --- | --- |
| `npm run build` | Build the package (tsup + tsc — dual ESM/CJS output with `.d.ts`/`.d.cts` declarations) |
| `npm run dev` | Build in watch mode |
| `npm run lint` | Lint + formatting check with Biome (read-only) |
| `npm run format` | Format with Biome (writes changes) |
| `npm run check` | Lint + format in one pass (writes changes) |
| `npm run typecheck` | Type-check `src/` + `tests/` with `tsc` (no emit) |
| `npm test` | Run tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage reporting |

## Git hooks

Husky owns the Git hooks and invokes both checks on each commit:

1. **pre-commit** (invoked by `.husky/pre-commit` after lint-staged) — file hygiene (whitespace, EOL, YAML/JSON validation),
   secret scanning (gitleaks + TruffleHog), and shellcheck. Enforces
   `no-commit-to-branch` to protect `main`/`master`.

2. **Husky** — TypeScript-specific checks on staged files:
   - `pre-commit`: runs `lint-staged` (Biome format + lint on staged files
     only)
   - `commit-msg`: runs `commitlint` to enforce
     [conventional commits](https://www.conventionalcommits.org/)

Install Husky and the `pre-commit` binary for full coverage:
```bash
npx husky   # prepare script is blocked by .npmrc ignore-scripts=true
```
Do not run `pre-commit install`: Husky's `core.hooksPath` redirects Git
away from `.git/hooks`, so a second hook installation there will not run.

## Commit messages

This repo enforces [conventional commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`,
`perf`, `ci`.

Examples:
```
feat(auth): add token refresh logic
fix: handle null response from API
docs: update README with publish instructions
```

## Versioning and releases

This repo uses [Changesets](https://github.com/changesets/changesets) for
versioning. Versioning is **decoupled from merges** — you can merge multiple
PRs and release them all at once.

### Adding a changeset

Every PR that changes published output should include a changeset:

```bash
npx changeset
```

Select the bump type (patch/minor/major) and write a short summary. A new
`.md` file appears in `.changeset/` — commit it alongside your code.

### Releasing

Releases are automated. The [release workflow](.github/workflows/release.yml)
runs on every push to `main`: with pending changesets it opens a
"Version Packages" PR (`changeset version` bumps `package.json`, updates
`CHANGELOG.md`, and removes the consumed changesets); merging that PR
publishes to npm via OIDC trusted publishing (no npm tokens), tags the
release, and creates a GitHub Release. With no pending changesets the
workflow is a no-op.

### Before publishing, always verify

```bash
npm run build
npm pack --dry-run    # verify only dist/, README.md, CHANGELOG.md, LICENSE
```

## Publishing security

- **Trusted publishing (OIDC)** — the release workflow publishes with an OIDC
  token minted by GitHub Actions; there are no npm tokens (no `NPM_TOKEN`
  secret).
- **Provenance** — this repo publishes with `--provenance` (cryptographic
  attestation linking the published package to the commit + workflow).
  Requires a public repo and publishing from CI.
- **Scoped names** — `@knorby/*` scoped names prevent dependency confusion
  attacks; `publishConfig.access: "public"` is set because scoped packages
  default to restricted visibility.
- **No secrets in the package** — the `files` field in `package.json`
  whitelists only `dist`, `README.md`, `CHANGELOG.md`, and `LICENSE`.

## Pull request process

1. Create a branch from `main`.
2. Make your changes + add a changeset (`npx changeset`).
3. Ensure all checks pass: `npm run lint && npm run typecheck && npm test &&
   npm run build`.
4. Open a PR against `main`. CI runs lint, typecheck, build, test, and
   `npm audit`, plus the pre-commit suite (file hygiene + secret scanning).
5. After review, merge. Release separately via changesets.
