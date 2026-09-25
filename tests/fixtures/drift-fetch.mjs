// Preloaded by the drift CLI tests: all responses come from local snapshots.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_PATHS } from "../../src/endpoints.ts";

function example(shape, alternate = false) {
  if (Array.isArray(shape)) return [example(shape[0], alternate)];
  if (shape && typeof shape === "object") {
    return Object.fromEntries(
      Object.entries(shape).map(([key, value]) => [
        key,
        example(value, alternate),
      ]),
    );
  }
  if (shape === "number") return 1;
  if (shape === "boolean") return true;
  if (shape === "null") return null;
  if (shape === "mixed") return alternate ? 1 : "value";
  return "value";
}

globalThis.fetch = async (input) => {
  const pathname = new URL(input).pathname;
  if (pathname === "/download.json") {
    if (process.env.DRIFT_SCENARIO === "manifest-unavailable") {
      return Response.json(
        { error: { code: "SERVER_ERROR" } },
        { status: 503 },
      );
    }
    const results = {};
    for (const path of ALL_PATHS) {
      const [noun, endpoint] = path.split("/");
      results[noun] ??= {};
      results[noun][endpoint] = {};
    }
    if (process.env.DRIFT_SCENARIO === "new-endpoint") {
      results.drug.future = {};
    }
    return Response.json({ meta: { last_updated: "today" }, results });
  }
  const path = pathname.slice(1).replace(/\.json$/, "");
  if (process.env.DRIFT_SCENARIO === "rate-limited" && path === ALL_PATHS[0]) {
    return Response.json(
      { error: { code: "TOO_MANY_REQUESTS" } },
      { status: 429 },
    );
  }
  if (
    process.env.DRIFT_SCENARIO === "registered-404" &&
    path === ALL_PATHS[0]
  ) {
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  if (path === "drug/future") {
    return Response.json({ meta: {}, results: [{ future: true }] });
  }
  const file = resolve("tests/shapes", `${path.replace("/", ".")}.json`);
  const shape = JSON.parse(readFileSync(file, "utf8"));
  const records = [example(shape), example(shape, true)];
  if (
    process.env.DRIFT_SCENARIO === "error-with-results" &&
    path === ALL_PATHS[0]
  ) {
    return Response.json({ meta: {}, results: records }, { status: 500 });
  }
  if (process.env.DRIFT_SCENARIO === "shape-change" && path === "drug/label") {
    records[0].new_field = "drift";
  }
  return Response.json({ meta: {}, results: records });
};
