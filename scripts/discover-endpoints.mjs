// Discovers which openFDA endpoints are actually live and diffs them against
// the committed registry in src/endpoints.ts.
//
// Data sources:
// 1. https://api.fda.gov/download.json — machine-readable manifest of every
//    openFDA dataset (noun → endpoint → partitions). This is the candidate
//    universe; it sometimes lists datasets that are not queryable through the
//    search API (download-only), so each candidate is probed.
// 2. A live probe: GET https://api.fda.gov/{noun}/{endpoint}.json?limit=1 —
//    "alive" iff the response is 2xx JSON containing a `meta` key.
//
// Usage:
//   node scripts/discover-endpoints.mjs                 # print NEW/GONE/OK report
//   node scripts/discover-endpoints.mjs --fail-on-diff  # exit 1 on NEW/GONE
//
// Environment:
//   OPENFDA_API_KEY — optional; raised rate limits (240/min keyless).
//
// Zero dependencies by design (AGENTS.md); uses global fetch (Node 18+).
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://api.fda.gov";
const PROBE_SPACING_MS = 300;
const API_KEY = process.env.OPENFDA_API_KEY || "";
const FAIL_ON_DIFF = process.argv.includes("--fail-on-diff");
const REGISTRY_PATH = resolve(import.meta.dirname, "../src/endpoints.ts");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url) {
  const sep = url.includes("?") ? "&" : "?";
  const full = API_KEY ? `${url}${sep}api_key=${API_KEY}` : url;
  const res = await fetch(full, { headers: { Accept: "application/json" } });
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch {
    return { status: res.status, json: null };
  }
}

/** Candidate "noun/endpoint" paths from the download.json manifest. */
function manifestCandidates(manifest) {
  const results = manifest?.results;
  if (results === null || typeof results !== "object") return [];
  const paths = [];
  for (const [noun, endpoints] of Object.entries(results)) {
    if (endpoints === null || typeof endpoints !== "object") continue;
    for (const endpoint of Object.keys(endpoints)) {
      paths.push(`${noun}/${endpoint}`);
    }
  }
  return paths.sort();
}

/** Probes a candidate endpoint; "alive" iff 2xx JSON with a meta key. */
async function probeAlive(path) {
  let result;
  try {
    result = await fetchJson(`${BASE_URL}/${path}.json?limit=1`);
  } catch (err) {
    return { alive: false, detail: `network error: ${err?.message ?? err}` };
  }
  if (result.status >= 200 && result.status < 300 && result.json && "meta" in result.json) {
    return { alive: true, detail: "ok" };
  }
  const message =
    result.json && typeof result.json === "object" && "error" in result.json
      ? JSON.stringify(result.json.error)
      : `HTTP ${result.status}`;
  return { alive: false, detail: message };
}

/** Registry paths, imported directly (Node 24+ strips erasable TS types). */
async function registryPaths() {
  if (!existsSync(REGISTRY_PATH)) return null;
  const registry = await import(REGISTRY_PATH);
  return [...registry.ALL_PATHS];
}

const manifest = await fetchJson(`${BASE_URL}/download.json`);
if (!manifest.json) {
  console.error("discover-endpoints: could not fetch download.json");
  process.exit(1);
}
const candidates = manifestCandidates(manifest.json);
console.log(
  `discover-endpoints: ${candidates.length} candidate endpoint(s) from download.json (last_updated ${manifest.json.meta?.last_updated ?? "?"})`,
);

const alive = [];
for (const path of candidates) {
  await sleep(PROBE_SPACING_MS);
  const probe = await probeAlive(path);
  if (probe.alive) {
    alive.push(path);
    console.log(`  ALIVE  ${path}`);
  } else {
    console.log(`  dead   ${path}  (${probe.detail})`);
  }
}

const registered = await registryPaths();
if (registered === null) {
  console.log(
    `\nno registry at src/endpoints.ts yet — ${alive.length} live endpoint(s) to seed it with:\n${alive.map((p) => `  ${p}`).join("\n")}`,
  );
  process.exit(0);
}

const aliveSet = new Set(alive);
const registeredSet = new Set(registered);
const news = alive.filter((p) => !registeredSet.has(p));
const gone = registered.filter((p) => !aliveSet.has(p));

const rows = registered.map((p) => `${aliveSet.has(p) ? "OK  " : "GONE"}  ${p}`);
for (const p of news) rows.push(`NEW   ${p}`);
console.log(`\nregistry diff vs ${alive.length} live endpoint(s):`);
console.log(rows.join("\n"));

if (news.length > 0 || gone.length > 0) {
  if (news.length > 0) console.error(`NEW endpoints (add to registry): ${news.join(", ")}`);
  if (gone.length > 0) console.error(`GONE endpoints (remove from registry): ${gone.join(", ")}`);
  if (FAIL_ON_DIFF) process.exit(1);
}
