// Captures a structural "shape" snapshot of every live openFDA endpoint and
// compares it to the committed snapshots in tests/shapes/.
//
// The shape of a record is its skeleton with no values:
//   - objects  → { key: shape } with sorted keys
//   - arrays   → [shape of the merged union of all elements]
//   - scalars  → "string" | "number" | "boolean" | "null"
//
// openFDA publishes no machine-readable field schemas, so committed shape
// snapshots are the drift tripwire: when the API grows, loses, or retypes a
// field, a regenerated capture differs from the committed snapshot and
// `--check` fails — signaling that the typed models (or registry) need
// review. Snapshots also document the ~20 endpoints that have no
// hand-written models yet.
//
// Usage:
//   node scripts/capture-shapes.mjs             # rewrite tests/shapes/*.json
//   node scripts/capture-shapes.mjs --check     # 2 drift, 1 probe failure
//
// Environment:
//   OPENFDA_API_KEY — optional; raised rate limits. 5 records per endpoint
//   with 300ms spacing is well within either limit.
//
// No extra script dependencies; run with the repo's Node 24 toolchain
// (the registry is imported directly from TypeScript).
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { ALL_PATHS } from "../src/endpoints.ts";

const require = createRequire(import.meta.url);
const execFileP = promisify(execFile);

const BASE_URL = "https://api.fda.gov";
const SHAPES_DIR = resolve(import.meta.dirname, "../tests/shapes");
const PROBE_SPACING_MS = Number(process.env.OPENFDA_PROBE_SPACING_MS ?? 300);
const RECORDS_PER_ENDPOINT = 5;
const API_KEY = process.env.OPENFDA_API_KEY || "";
const CHECK_ONLY = process.argv.includes("--check");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Structural shape of a value: skeleton only, no data. */
function shapeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return [shapeOfRecord(value)];
  if (typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = shapeOf(value[key]);
    }
    return out;
  }
  return typeof value;
}

/** Shape of an array: the merged union of every element's shape. */
function shapeOfRecord(array) {
  let merged;
  for (const element of array) {
    const s = shapeOf(element);
    merged = merged === undefined ? s : mergeShapes(merged, s);
  }
  return merged ?? "null";
}

/**
 * Merges two shapes: object keys unite (union of possible fields), nested
 * arrays merge, differing scalars widen to "mixed" (objects beat scalars).
 */
function mergeShapes(a, b) {
  if (a === b) return a;
  const bothObjects = typeof a === "object" && typeof b === "object";
  if (bothObjects && !Array.isArray(a) && !Array.isArray(b)) {
    const out = { ...a };
    for (const [key, bShape] of Object.entries(b)) {
      out[key] = key in a ? mergeShapes(a[key], bShape) : bShape;
    }
    return out;
  }
  const bothArrays = Array.isArray(a) && Array.isArray(b);
  if (bothArrays) {
    return [mergeShapes(a[0], b[0])];
  }
  // Incompatible kinds: prefer the object shape (more informative).
  const objectSide = [a, b].find(
    (s) => typeof s === "object" && !Array.isArray(s),
  );
  return objectSide ?? "mixed";
}

async function fetchRecords(path) {
  const url = `${BASE_URL}/${path}.json?limit=${RECORDS_PER_ENDPOINT}${
    API_KEY ? `&api_key=${encodeURIComponent(API_KEY)}` : ""
  }`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Non-JSON (empty dataset 404, gateway error) — reported by caller.
  }
  return { res, json };
}

/** Captures one endpoint, failing when a probe cannot establish its shape. */
async function captureEndpoint(path) {
  await sleep(PROBE_SPACING_MS);
  const { res, json } = await fetchRecords(path);
  if (!res.ok) {
    throw new Error(`capture-shapes: ${path} returned HTTP ${res.status}`);
  }
  const records = json?.results;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`capture-shapes: ${path} returned no records (HTTP ${res.status})`);
  }
  return shapeOfRecord(records);
}

/**
 * Reformats tests/shapes with the repo's Biome so regenerated snapshots
 * match `npm run lint` exactly (Biome owns JSON formatting here — e.g. it
 * collapses single-element arrays, which JSON.stringify never does).
 */
async function formatShapes() {
  try {
    const bin = require.resolve("@biomejs/biome/bin/biome");
    await execFileP(process.execPath, [bin, "format", "--write", SHAPES_DIR]);
  } catch (error) {
    console.warn(
      `capture-shapes: could not run Biome (${error instanceof Error ? error.message : error}) — run \`npx biome format --write tests/shapes\` before committing`,
    );
  }
}

/** Flattens a shape into "path: kind" leaf strings for diffing. */
function flattenShape(shape, prefix = "") {
  if (typeof shape === "string") return [`${prefix || "<root>"}: ${shape}`];
  if (Array.isArray(shape)) {
    return flattenShape(shape[0], `${prefix}[]`);
  }
  const leaves = [];
  for (const [key, child] of Object.entries(shape)) {
    leaves.push(...flattenShape(child, prefix ? `${prefix}.${key}` : key));
  }
  return leaves;
}

// ── main ──────────────────────────────────────────────────────────────────
const shapes = new Map();
for (const path of ALL_PATHS) {
  try {
    shapes.set(path, await captureEndpoint(path));
  } catch {
    console.error(`capture-shapes: probe for ${path} failed or returned no records`);
    process.exit(1);
  }
}

if (!CHECK_ONLY) {
  await mkdir(SHAPES_DIR, { recursive: true });
  for (const [path, shape] of shapes) {
    const file = resolve(SHAPES_DIR, `${path.replace("/", ".")}.json`);
    await writeFile(file, `${JSON.stringify(shape, null, 2)}\n`);
  }
  await formatShapes();
  console.log(
    `capture-shapes: wrote ${shapes.size} snapshot(s) to tests/shapes/`,
  );
  process.exit(0);
}

// ── --check: diff regenerated shapes against committed snapshots ─────────
await mkdir(SHAPES_DIR, { recursive: true });
const committed = new Map();
for (const file of await readdir(SHAPES_DIR)) {
  if (!file.endsWith(".json")) continue;
  const path = file.replace(/\.json$/, "").replace(".", "/");
  committed.set(path, JSON.parse(await readFile(resolve(SHAPES_DIR, file), "utf8")));
}

const drifted = [];
const lines = [];
for (const path of ALL_PATHS) {
  const live = shapes.get(path);
  const snapshot = committed.get(path);
  if (snapshot === undefined) {
    drifted.push(path);
    lines.push(`${path}: no committed snapshot (new endpoint?)`);
    continue;
  }
  const before = new Set(flattenShape(snapshot));
  const after = new Set(flattenShape(live));
  const added = [...after].filter((l) => !before.has(l));
  const removed = [...before].filter((l) => !after.has(l));
  if (added.length > 0 || removed.length > 0) {
    drifted.push(path);
    if (added.length > 0) {
      lines.push(`${path}: fields ADDED (types may be stale):\n  ${added.join("\n  ")}`);
    }
    if (removed.length > 0) {
      lines.push(`${path}: fields REMOVED (possible breaking change):\n  ${removed.join("\n  ")}`);
    }
  }
}

if (drifted.length > 0) {
  console.error(`capture-shapes --check: DRIFT DETECTED in ${drifted.length} endpoint(s):\n`);
  console.error(lines.join("\n"));
  process.exit(2);
}
console.log(
  `capture-shapes --check: no drift across ${shapes.size} captured endpoint(s)`,
);
