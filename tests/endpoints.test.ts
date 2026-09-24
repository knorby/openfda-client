import { describe, expect, it } from "vitest";
import { ALL_PATHS, ENDPOINTS } from "../src/endpoints";

describe("ENDPOINTS registry", () => {
  it("covers every noun that has at least one endpoint", () => {
    for (const endpoints of Object.values(ENDPOINTS)) {
      expect(endpoints.length).toBeGreaterThan(0);
    }
  });

  it("uses only lowercase-alphanumeric identifiers", () => {
    for (const path of ALL_PATHS) {
      expect(path).toMatch(/^[a-z0-9]+\/[a-z0-9]+$/);
    }
  });

  it("has no duplicate paths", () => {
    expect(new Set(ALL_PATHS).size).toBe(ALL_PATHS.length);
  });

  it("matches ALL_PATHS to the registry contents", () => {
    const expected = Object.entries(ENDPOINTS).flatMap(([noun, endpoints]) =>
      (endpoints as readonly string[]).map((endpoint) => `${noun}/${endpoint}`),
    );
    expect([...ALL_PATHS].sort()).toEqual([...expected].sort());
  });

  it("includes the typed priority paths", () => {
    const priority = [
      "drug/event",
      "drug/label",
      "drug/ndc",
      "drug/enforcement",
      "drug/drugsfda",
      "drug/orangebook",
      "drug/shortages",
      "food/event",
      "food/enforcement",
      "cosmetic/event",
    ] as const;
    for (const path of priority) {
      expect(ALL_PATHS).toContain(path);
    }
  });

  it("uses the real API paths that differ from docs slugs", () => {
    expect(ALL_PATHS).toContain("device/pma");
    expect(ALL_PATHS).not.toContain("device/premarketapproval");
    expect(ALL_PATHS).toContain("drug/shortages");
    expect(ALL_PATHS).not.toContain("drug/drugshortages");
  });

  it("has exactly 30 live endpoints as probed on 2026-09-23", () => {
    expect(ALL_PATHS.length).toBe(30);
  });
});
