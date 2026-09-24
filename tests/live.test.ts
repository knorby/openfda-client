/**
 * Live smoke tests against the real openFDA API.
 *
 * Skipped unless `OPENFDA_LIVE_TESTS=1` is set, to avoid hitting the network
 * (and the keyless 1,000 req/day limit) during normal `npm test` runs. Run
 * with:
 *
 *   OPENFDA_LIVE_TESTS=1 npx vitest run tests/live.test.ts
 *   # or: npm run test:live
 *
 * Optional: set `OPENFDA_API_KEY` to raise rate limits (240 req/min +
 * 120,000 req/day). These tests use tiny `limit` values to stay well within
 * limits and validate that the client wiring matches the current live API
 * shape.
 *
 * DISCLAIMER: exercise of these tests retrieves public FDA data; openFDA's
 * medical-care disclaimer applies to everything returned. This client is
 * not affiliated with the FDA.
 */
import { describe, expect, it } from "vitest";
import {
  type OpenFdaApiError,
  OpenFdaClient,
  OpenFdaNotFoundError,
} from "../src/index";

const RUN_LIVE = process.env.OPENFDA_LIVE_TESTS === "1";
const itLive = RUN_LIVE ? it : it.skip;

const client = new OpenFdaClient(
  process.env.OPENFDA_API_KEY ? { apiKey: process.env.OPENFDA_API_KEY } : {},
);

describe("live: drug/label", () => {
  itLive("search returns label records with harmonized data", async () => {
    const res = await client.drug.label.search({
      search: 'openfda.brand_name:"ADVIL"',
      limit: 1,
    });
    expect(res.meta.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.meta.results?.total).toBeGreaterThan(0);
    const label = res.results[0];
    expect(label?.id).toBeTruthy();
    expect(label?.openfda?.brand_name?.[0]).toMatch(/advil/i);
  });
});

describe("live: drug/event", () => {
  itLive("count returns term/count facets", async () => {
    const res = await client.drug.event.count({
      count: "patient.reaction.reactionmeddrapt.exact",
    });
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0]?.term).toBeTruthy();
    expect(res.results[0]?.count).toBeGreaterThan(0);
  });
});

describe("live: drug/ndc", () => {
  itLive("search returns NDC directory records", async () => {
    const res = await client.drug.ndc.search({
      search: 'brand_name:"TYLENOL"',
      limit: 1,
    });
    expect(res.results[0]?.product_ndc).toBeTruthy();
  });
});

describe("live: drug/enforcement + searchAll", () => {
  itLive("searchAll paginates across pages", async () => {
    let seen = 0;
    for await (const record of client.drug.enforcement.searchAll(
      { search: "report_date:[20230101 TO 20231231]" },
      2,
    )) {
      expect(record.event_id).toBeTruthy();
      seen += 1;
      if (seen >= 3) return;
    }
    expect(seen).toBeGreaterThanOrEqual(3);
  });
});

describe("live: drug/drugsfda", () => {
  itLive("search returns application records", async () => {
    const res = await client.drug.drugsfda.search({
      search: 'application_number:"NDA020533"',
      limit: 1,
    });
    expect(res.results[0]?.application_number).toBe("NDA020533");
    expect(res.results[0]?.sponsor_name).toBeTruthy();
  });
});

describe("live: drug/shortages", () => {
  itLive("search returns shortage records or clean zero-match", async () => {
    try {
      const res = await client.drug.shortages.search({ limit: 1 });
      expect(res.results.length).toBeLessThanOrEqual(1);
    } catch (err) {
      // The shortages dataset is small and sometimes fully resolved; a
      // zero-match 404 is an acceptable live outcome here.
      expect(err).toBeInstanceOf(OpenFdaNotFoundError);
    }
  });
});

describe("live: food", () => {
  itLive("food/event search returns reports", async () => {
    const res = await client.food.event.search({ limit: 1 });
    expect(res.results[0]?.report_number).toBeTruthy();
  });

  itLive("food/enforcement search returns recall reports", async () => {
    const res = await client.food.enforcement.search({
      search: "status:Ongoing",
      limit: 1,
    });
    expect(res.results[0]?.event_id).toBeTruthy();
  });
});

describe("live: cosmetic/event", () => {
  itLive("search returns cosmetic adverse-event reports", async () => {
    const res = await client.cosmetic.event.search({ limit: 1 });
    expect(res.results[0]?.report_number).toBeTruthy();
  });
});

describe("live: generic path access", () => {
  itLive("client.search hits any registered path", async () => {
    const res = await client.search("device/classification", { limit: 1 });
    expect(res.results[0]).toBeTruthy();
  });
});

describe("live: zero matches surface as OpenFdaNotFoundError", () => {
  itLive("rejects with OpenFdaNotFoundError, not an empty result", async () => {
    const err = await client.drug.label
      .search({ search: 'openfda.brand_name.exact:"zzz_no_such_drug_zzz"' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenFdaNotFoundError);
    expect((err as OpenFdaApiError).status).toBe(404);
  });
});
