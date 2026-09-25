import { describe, expect, it } from "vitest";
import { OpenFdaClient } from "../src/client";
import { envelope, queuedFetch } from "./helpers";

function clientWith(responses: unknown[] | (() => unknown)) {
  const { fetch, urls } = queuedFetch(responses);
  return { client: new OpenFdaClient({ fetch }), urls };
}

describe("namespaced search", () => {
  it("routes client.drug.label.search to /drug/label.json with params", async () => {
    const { client, urls } = clientWith([envelope([{ dummy: 1 }], 1)]);
    const res = await client.drug.label.search({ search: "a b", limit: 5 });
    expect(urls[0]).toBe(
      "https://api.fda.gov/drug/label.json?search=a%20b&limit=5",
    );
    expect(res.results).toEqual([{ dummy: 1 }]);
    expect(res.meta.last_updated).toBe("2026-09-22");
  });

  it("routes client.food.event.search to /food/event.json", async () => {
    const { client, urls } = clientWith([envelope([], 0)]);
    await client.food.event.search();
    expect(urls[0]).toBe("https://api.fda.gov/food/event.json");
  });

  it("count sends the count param and returns term/count results", async () => {
    const { client, urls } = clientWith([
      envelope(
        [
          { term: "HEADACHE", count: 123 },
          { term: "NAUSEA", count: 45 },
        ],
        undefined,
      ),
    ]);
    const res = await client.drug.event.count({
      count: "patient.reaction.reactionmeddrapt.exact",
    });
    expect(urls[0]).toBe(
      "https://api.fda.gov/drug/event.json?count=patient.reaction.reactionmeddrapt.exact",
    );
    expect(res.results[0]?.term).toBe("HEADACHE");
    expect(res.results[0]?.count).toBe(123);
  });
});

describe("generic path access", () => {
  it("searches any registered path via client.search", async () => {
    const { client, urls } = clientWith([envelope([{ udi: "x" }], 1)]);
    const res = await client.search("device/udi", { limit: 1 });
    expect(urls[0]).toBe("https://api.fda.gov/device/udi.json?limit=1");
    expect(res.results).toEqual([{ udi: "x" }]);
  });

  it("counts via any path via client.count", async () => {
    const { client, urls } = clientWith([envelope([{ term: "t", count: 1 }])]);
    await client.count("tobacco/problem", { count: "report_id.exact" });
    expect(urls[0]).toBe(
      "https://api.fda.gov/tobacco/problem.json?count=report_id.exact",
    );
  });

  it("exposes digit-leading endpoint keys via bracket access", () => {
    const { client } = clientWith([envelope([], 0)]);
    expect(typeof client.device["510k"].search).toBe("function");
  });

  it("rejects unregistered nouns at the namespace level but allows generic search", async () => {
    const { client, urls } = clientWith([envelope([{ ok: 1 }], 1)]);
    // Namespace for a noun that is not a registry member is undefined:
    expect(
      (client as unknown as Record<string, unknown>).nosuchnoun,
    ).toBeUndefined();
    // …while the generic path method still issues the request (escape hatch):
    await client.search("nosuchnoun/thing", { limit: 1 });
    expect(urls[0]).toBe("https://api.fda.gov/nosuchnoun/thing.json?limit=1");
  });
});

describe("searchAll pagination", () => {
  it("walks pages until a short page and stops", async () => {
    let call = 0;
    const { client, urls } = clientWith(() => {
      call += 1;
      return call === 1 ? envelope([{ n: 1 }, { n: 2 }]) : envelope([{ n: 3 }]);
    });
    const seen: number[] = [];
    for await (const rec of client.drug.enforcement.searchAll(
      { search: "x" },
      2,
    )) {
      seen.push((rec as { n?: number }).n as number);
    }
    expect(seen).toEqual([1, 2, 3]);
    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain("skip=2");
  });

  it("stops early once meta.results.total is reached", async () => {
    let call = 0;
    const { client, urls } = clientWith(() => {
      call += 1;
      return call === 1
        ? envelope([{ a: 1 }, { a: 2 }], 3)
        : envelope([{ a: 3 }], 3);
    });
    const yielded: unknown[] = [];
    for await (const rec of client.drug.ndc.searchAll({}, 2)) {
      yielded.push(rec);
    }
    expect(yielded).toHaveLength(3);
    expect(urls).toHaveLength(2);
  });

  it("clamps pageSize above the API limit of 1000", async () => {
    const { client, urls } = clientWith([envelope([], 0)]);
    const yielded: unknown[] = [];
    for await (const rec of client.drug.label.searchAll({}, 5000)) {
      yielded.push(rec);
    }
    expect(yielded).toHaveLength(0);
    expect(urls[0]).toContain("limit=1000");
  });

  it("stops before issuing a request with skip above 25000", async () => {
    const page = envelope(
      Array.from({ length: 1000 }, (_, i) => ({ i })),
      undefined,
    );
    const { client, urls } = clientWith(() => page);
    let count = 0;
    for await (const _rec of client.drug.label.searchAll({}, 1000)) {
      count += 1;
    }
    expect(count).toBe(26_000);
    expect(urls).toHaveLength(26);
    for (const url of urls) {
      expect(Number(new URL(url).searchParams.get("skip"))).toBeLessThanOrEqual(
        25_000,
      );
    }
  });

  it("rejects non-positive or fractional pageSize", async () => {
    const { client } = clientWith([envelope([], 0)]);
    await expect(
      (async () => {
        for await (const _rec of client.drug.label.searchAll({}, 0)) {
          // no-op
        }
      })(),
    ).rejects.toThrow(RangeError);
    await expect(
      (async () => {
        for await (const _rec of client.drug.label.searchAll({}, 2.5)) {
          // no-op
        }
      })(),
    ).rejects.toThrow(RangeError);
  });

  it("validates pageSize eagerly, before the generator is iterated", () => {
    const { client } = clientWith([envelope([], 0)]);
    // A lazy (generator-body) check would only throw on the first next().
    expect(() => client.drug.label.searchAll({}, 0)).toThrow(RangeError);
    expect(() => client.drug.label.searchAll({}, 2.5)).toThrow(RangeError);
    expect(() => client.drug.label.searchAll({}, 100)).not.toThrow();
  });
});
