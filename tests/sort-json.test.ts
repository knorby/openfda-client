import { describe, expect, it } from "vitest";
import { sortJson } from "../scripts/sort-json";

describe("sortJson", () => {
  it("sorts nested object keys recursively", () => {
    const input = {
      zebra: { yak: 1, xray: 2 },
      alpha: [{ delta: 4, charlie: 3 }],
      scalar: "value",
    };

    expect(JSON.stringify(sortJson(input))).toBe(
      '{"alpha":[{"charlie":3,"delta":4}],"scalar":"value","zebra":{"xray":2,"yak":1}}',
    );
  });

  it("preserves empty containers and scalar values", () => {
    const input = {
      zebra: [],
      alpha: {},
      empty: null,
      string: "value",
      boolean: true,
      number: 1,
    };

    expect(JSON.stringify(sortJson(input))).toBe(
      '{"alpha":{},"boolean":true,"empty":null,"number":1,"string":"value","zebra":[]}',
    );
  });
});
