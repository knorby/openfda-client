import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const preload = resolve("tests/fixtures/drift-fetch.mjs");

function runDrift(script: string, scenario?: string) {
  return spawnSync(
    process.execPath,
    ["--import", preload, `scripts/${script}.mjs`, "--check", "--fail-on-diff"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        OPENFDA_API_KEY: "",
        OPENFDA_PROBE_SPACING_MS: "0",
        DRIFT_SCENARIO: scenario ?? "none",
      },
      timeout: 30_000,
    },
  );
}

describe("drift CLI exit status", () => {
  it("returns zero when the manifest and shapes match", () => {
    const discovery = runDrift("discover-endpoints");
    const shapes = runDrift("capture-shapes");
    expect(discovery.status, discovery.stderr).toBe(0);
    expect(shapes.status, shapes.stderr).toBe(0);
  });

  it("returns two with an endpoint diff or a field diff", () => {
    const discovery = runDrift("discover-endpoints", "new-endpoint");
    const shapes = runDrift("capture-shapes", "shape-change");
    expect(discovery.status, discovery.stderr).toBe(2);
    expect(discovery.stderr).toContain("NEW endpoints");
    expect(shapes.status, shapes.stderr).toBe(2);
    expect(shapes.stderr).toContain("new_field");
  });

  it("returns one on rate limits instead of reporting gone or shape drift", () => {
    for (const script of ["discover-endpoints", "capture-shapes"]) {
      const result = runDrift(script, "rate-limited");
      expect(result.status, result.stderr).toBe(1);
      expect(result.stdout).not.toContain("GONE");
      expect(result.stderr).not.toContain("DRIFT DETECTED");
    }
  });

  it("treats an unavailable manifest or an ambiguous registered 404 as inconclusive", () => {
    for (const scenario of ["manifest-unavailable", "registered-404"]) {
      const result = runDrift("discover-endpoints", scenario);
      expect(result.status, result.stderr).toBe(1);
      expect(result.stdout).not.toContain("GONE");
      expect(result.stderr).not.toContain("NEW endpoints");
    }
  });

  it("rejects an HTTP failure even when its body contains records", () => {
    const result = runDrift("capture-shapes", "error-with-results");
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain("probe for");
  });
});

it("gates drift PRs on explicit drift status and captures diagnostic stderr", () => {
  const workflow = readFileSync(".github/workflows/api-drift.yml", "utf8");
  expect(workflow).toContain("steps.endpoints.outputs.drift == 'true'");
  expect(workflow).toContain("steps.shapes.outputs.drift == 'true'");
  expect(workflow).toContain("2>&1");
  expect(workflow).toMatch(
    /if: success\(\) && .*steps\.endpoints\.outputs\.drift/,
  );
  expect(workflow).not.toContain(
    "node scripts/capture-shapes.mjs --check || true",
  );
});
