import { describe, expect, it } from "vitest";
import {
  buildQueryString,
  mergeParams,
} from "../src/utils/serialize";

describe("buildQueryString", () => {
  it("encodes scalars and joins with &", () => {
    expect(buildQueryString({ search: "a b", limit: 5 })).toBe(
      "search=a%20b&limit=5",
    );
  });

  it("omits undefined, null, and empty arrays", () => {
    expect(
      buildQueryString({ a: undefined, b: null, c: [], d: 1 }),
    ).toBe("d=1");
  });

  it("joins array values with a literal (unencoded) comma", () => {
    expect(buildQueryString({ sort: ["brand_name:asc", "x"] })).toBe(
      "sort=brand_name%3Aasc,x",
    );
  });

  it("encodes reserved characters (quotes, colons, brackets)", () => {
    expect(buildQueryString({ search: 'openfda.brand_name:"lipitor"' })).toBe(
      "search=openfda.brand_name%3A%22lipitor%22",
    );
  });

  it("returns an empty string for no params", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("encodes keys too", () => {
    expect(buildQueryString({ "a b": 1 })).toBe("a%20b=1");
  });
});

describe("mergeParams", () => {
  it("lets extra params win", () => {
    expect(mergeParams({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
  });

  it("handles an undefined base", () => {
    expect(mergeParams(undefined, { api_key: "k" })).toEqual({ api_key: "k" });
  });

  it("survives a __proto__ key from JSON input", () => {
    const out = mergeParams(JSON.parse('{"__proto__": {"polluted": 1}}'), {});
    expect(Object.hasOwn(out, "__proto__")).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
