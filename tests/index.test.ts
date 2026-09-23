import { expect, test } from "vitest";
import * as pkg from "../src/index";

test("exports the full public surface", () => {
  const expectedValues = [
    "OpenFdaClient",
    "createEndpoint",
    "DEFAULT_BASE_URL",
    "DEFAULT_PAGE_SIZE",
    "DEFAULT_TIMEOUT_MS",
    "MAX_LIMIT",
    "MAX_SKIP",
    "ALL_PATHS",
    "ENDPOINTS",
    "OpenFdaApiError",
    "OpenFdaError",
    "OpenFdaNetworkError",
    "OpenFdaNotFoundError",
    "OpenFdaTimeoutError",
    "and",
    "exact",
    "exists",
    "field",
    "not",
    "or",
    "range",
    "term",
    "buildQueryString",
    "mergeParams",
  ];
  for (const name of expectedValues) {
    expect(pkg, `missing export: ${name}`).toHaveProperty(name);
  }
});

test("constructs a client with an injected fetch", async () => {
  const client = new pkg.OpenFdaClient({
    fetch: () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ meta: { last_updated: "x" }, results: [] }),
          {
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
  });
  const res = await client.drug.label.search({ limit: 1 });
  expect(res.meta.last_updated).toBe("x");
  expect(client.drug.label.search).toBeTypeOf("function");
});
