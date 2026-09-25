import { describe, expect, it } from "vitest";
import { and, exact, exists, field, not, or, range, term } from "../src/query";

describe("term", () => {
  it("leaves single tokens unquoted", () => {
    expect(term("lipitor")).toBe("lipitor");
  });

  it("quotes values containing whitespace", () => {
    expect(term("atorvastatin calcium")).toBe('"atorvastatin calcium"');
  });

  it("quotes values containing colons", () => {
    expect(term("a:b")).toBe('"a:b"');
  });

  it("escapes embedded quotes", () => {
    expect(term('the "best" drug')).toBe('"the \\"best\\" drug"');
  });

  it("leaves already-plain values untouched", () => {
    expect(term("0069-1530")).toBe("0069-1530");
  });
});

describe("field / exact", () => {
  it("builds field:value pairs", () => {
    expect(field("openfda.brand_name", "lipitor")).toBe(
      "openfda.brand_name:lipitor",
    );
  });

  it("quotes phrase values automatically", () => {
    expect(field("active_ingredient", "atorvastatin calcium")).toBe(
      'active_ingredient:"atorvastatin calcium"',
    );
  });

  it("appends .exact for exact matches", () => {
    expect(exact("openfda.brand_name", "LIPITOR")).toBe(
      "openfda.brand_name.exact:LIPITOR",
    );
  });
});

describe("and / or / not", () => {
  it("joins clauses with AND", () => {
    expect(
      and(
        field("openfda.brand_name", "lipitor"),
        range("receivedate", { gte: "20200101" }),
      ),
    ).toBe("openfda.brand_name:lipitor AND receivedate:[20200101 TO *]");
  });

  it("returns a single clause unchanged", () => {
    expect(and(field("a", "b"))).toBe("a:b");
    expect(or(field("a", "b"))).toBe("a:b");
  });

  it("throws RangeError on empty clause lists", () => {
    expect(() => and()).toThrow(RangeError);
    expect(() => or()).toThrow(RangeError);
  });

  it("joins clauses with OR", () => {
    expect(or(field("a", "1"), field("b", "2"))).toBe("a:1 OR b:2");
  });

  it("negates a clause with NOT", () => {
    expect(not(field("openfda.brand_name", "lipitor"))).toBe(
      "NOT openfda.brand_name:lipitor",
    );
  });

  it("parenthesizes compound clauses under NOT", () => {
    // Without grouping, `NOT a:1 OR a:2` parses as `(NOT a:1) OR a:2`.
    expect(not(or(field("a", "1"), field("a", "2")))).toBe("NOT (a:1 OR a:2)");
    expect(not(and(field("a", "1"), field("b", "2")))).toBe(
      "NOT (a:1 AND b:2)",
    );
  });

  it("nests groups with parentheses", () => {
    expect(and(or(field("a", "1"), field("a", "2")), field("b", "3"))).toBe(
      "(a:1 OR a:2) AND b:3",
    );
  });
});

describe("range / exists", () => {
  it("builds bounded ranges", () => {
    expect(range("receivedate", { gte: "20200101", lte: "20201231" })).toBe(
      "receivedate:[20200101 TO 20201231]",
    );
  });

  it("supports open-ended ranges", () => {
    expect(range("receivedate", { gte: "20200101" })).toBe(
      "receivedate:[20200101 TO *]",
    );
    expect(range("receivedate", { lte: "20201231" })).toBe(
      "receivedate:[* TO 20201231]",
    );
  });

  it("requires at least one bound", () => {
    expect(() => range("receivedate", {})).toThrow(RangeError);
  });

  it("builds exists clauses", () => {
    expect(exists("openfda.rxcui")).toBe("_exists_:openfda.rxcui");
  });
});
