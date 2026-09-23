# ADR-0002: Split build — tsup bundles, tsc declarations, import-path fix

- **Status:** Accepted
- **Date:** 2026-09-23
- (Mirrors the same decision proven in `@knorby/nih-dsld-client`.)

## Context

The package ships dual ESM/CJS output with TypeScript declarations consumed
under `moduleResolution: node16`/`nodenext`, which requires relative import
specifiers in `.d.ts` files to carry explicit `.js` extensions.

Two available declaration strategies both fail a constraint:

- tsup's `dts: true` (rollup-plugin-dts) emits a single self-contained
  declaration file but is **incompatible with this repo's TypeScript 7**
  toolchain.
- `tsc --emitDeclarationOnly` emits per-file declarations but writes
  extensionless specifiers (`from "./client"`), which Node16-style
  consumers reject with TS2834.

## Decision

Keep the split build: tsup bundles the runtime (ESM + CJS, `PKG_VERSION`
injected via `define`), `tsc --emitDeclarationOnly` emits declarations, and
`scripts/fix-declaration-imports.mjs` (a zero-dep post-step) rewrites every
extensionless relative specifier in `dist/**/*.d.ts` to explicit `.js`
paths. TypeScript maps `./client.js` → `./client.d.ts`, which ships
alongside it.

## Consequences

- One extra small script runs in `npm run build`; its output is verified by
  CI's build step.
- If tsup's dts support gains TypeScript 7 compatibility, this decision can
  be revisited and the post-step deleted.
