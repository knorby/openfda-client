import type { OpenFdaResponse } from "../src/types/common";

/** Builds a full openFDA-style envelope for mocked fetch responses. */
export function envelope<T>(results: T[], total?: number): OpenFdaResponse<T> {
  return {
    meta: {
      disclaimer:
        "Do not rely on openFDA to make decisions regarding medical care.",
      terms: "https://open.fda.gov/terms/",
      license: "https://open.fda.gov/license/",
      last_updated: "2026-09-22",
      ...(total === undefined
        ? {}
        : { results: { skip: 0, limit: results.length, total } }),
    },
    results,
  };
}

/** A queued-response fetch mock that records every requested URL. */
export function queuedFetch(responses: unknown[] | (() => unknown)) {
  const urls: string[] = [];
  let call = 0;
  const fn = (url: string | URL | Request): Promise<Response> => {
    urls.push(String(url));
    const body =
      typeof responses === "function"
        ? (responses as () => unknown)()
        : responses[Math.min(call, responses.length - 1)];
    call += 1;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  return { fetch: fn as unknown as typeof fetch, urls };
}
