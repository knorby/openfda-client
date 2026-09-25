import { describe, expect, it, vi } from "vitest";
import {
  OpenFdaApiError,
  OpenFdaError,
  OpenFdaNetworkError,
  OpenFdaNotFoundError,
  OpenFdaTimeoutError,
} from "../src/errors";
import { OpenFdaRequester } from "../src/http";

/** Builds a mocked `fetch` returning the given JSON/status. */
function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

/** Builds a `fetch` mock that never resolves (respects abort). */
function hangingFetch() {
  return vi.fn((_url: string | URL | Request, init?: RequestInit) => {
    const signal = init?.signal;
    if (signal?.aborted) {
      return Promise.reject(
        new DOMException("The operation was aborted.", "AbortError"),
      );
    }
    return new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener("abort", () =>
        reject(new DOMException("The operation was aborted.", "AbortError")),
      );
    });
  });
}

/** Mock fetch that records the requested URL and returns a canned response. */
function recordingFetch(response: () => Response): {
  fetch: typeof fetch;
  lastUrl: () => string;
} {
  let lastUrl = "";
  const fn = vi.fn((url: string | URL | Request): Promise<Response> => {
    lastUrl = String(url);
    return Promise.resolve(response());
  }) as unknown as typeof fetch;
  (fn as unknown as { lastUrl: () => string }).lastUrl = () => lastUrl;
  return { fetch: fn, lastUrl: () => lastUrl };
}

describe("OpenFdaRequester.get", () => {
  it("builds the URL from path + params", async () => {
    const { fetch, lastUrl } = recordingFetch(() => jsonResponse({ ok: true }));
    const requester = new OpenFdaRequester({ fetch });
    const result = await requester.get("drug/label.json", {
      search: "a b",
      limit: 5,
    });
    expect(lastUrl()).toBe(
      "https://api.fda.gov/drug/label.json?search=a%20b&limit=5",
    );
    expect(result).toEqual({ ok: true });
  });

  it("appends api_key as a query param when configured", async () => {
    const { fetch, lastUrl } = recordingFetch(() => jsonResponse({}));
    const requester = new OpenFdaRequester({ fetch, apiKey: "SECRET" });
    await requester.get("drug/event.json", { limit: 1 });
    expect(lastUrl()).toBe(
      "https://api.fda.gov/drug/event.json?limit=1&api_key=SECRET",
    );
  });

  it("resolves to null on an empty 2xx body", async () => {
    const { fetch } = recordingFetch(() => new Response(""));
    const requester = new OpenFdaRequester({ fetch });
    expect(await requester.get("other/nsde.json")).toBeNull();
  });

  it("sends Accept + default User-Agent headers", async () => {
    let seenHeaders: Headers | undefined;
    const fn = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      seenHeaders = new Headers(init?.headers);
      return Promise.resolve(jsonResponse({}));
    }) as unknown as typeof fetch;
    await new OpenFdaRequester({ fetch: fn }).get("drug/label.json");
    expect(seenHeaders?.get("Accept")).toBe("application/json");
    expect(seenHeaders?.get("User-Agent")).toContain("@knorby/openfda-client/");
  });

  it("honors a custom User-Agent and extra headers", async () => {
    let seenHeaders: Headers | undefined;
    const fn = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      seenHeaders = new Headers(init?.headers);
      return Promise.resolve(jsonResponse({}));
    }) as unknown as typeof fetch;
    await new OpenFdaRequester({
      fetch: fn,
      userAgent: "my-app/1",
      headers: { "X-Custom": "yes" },
    }).get("drug/label.json");
    expect(seenHeaders?.get("User-Agent")).toBe("my-app/1");
    expect(seenHeaders?.get("X-Custom")).toBe("yes");
  });
});

describe("error mapping", () => {
  it("maps 404 NOT_FOUND to OpenFdaNotFoundError", async () => {
    const { fetch } = recordingFetch(() =>
      jsonResponse(
        { error: { code: "NOT_FOUND", message: "No matches found!" } },
        { status: 404 },
      ),
    );
    const requester = new OpenFdaRequester({ fetch });
    const err = await requester
      .get("drug/label.json", { search: "zzz" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenFdaNotFoundError);
    expect((err as OpenFdaNotFoundError).code).toBe("NOT_FOUND");
  });

  it("maps other non-2xx to OpenFdaApiError with the parsed code", async () => {
    const { fetch } = recordingFetch(() =>
      jsonResponse(
        { error: { code: "INVALID_QUERY", message: "bad" } },
        { status: 400 },
      ),
    );
    const requester = new OpenFdaRequester({ fetch });
    const err = (await requester
      .get("drug/event.json", { search: "!!!" })
      .catch((e: unknown) => e)) as OpenFdaApiError;
    expect(err).toBeInstanceOf(OpenFdaApiError);
    expect(err).not.toBeInstanceOf(OpenFdaNotFoundError);
    expect(err.status).toBe(400);
    expect(err.code).toBe("INVALID_QUERY");
  });

  it("redacts api_key in OpenFdaApiError.url", async () => {
    const { fetch } = recordingFetch(() => jsonResponse({}, { status: 500 }));
    const requester = new OpenFdaRequester({ fetch, apiKey: "SECRET" });
    const err = (await requester
      .get("drug/label.json")
      .catch((e: unknown) => e)) as OpenFdaApiError;
    expect(err).toBeInstanceOf(OpenFdaApiError);
    expect(err.url).not.toContain("SECRET");
    expect(err.url).toContain("[redacted]");
  });

  it("parses Retry-After seconds on 429", async () => {
    const { fetch } = recordingFetch(() =>
      jsonResponse({}, { status: 429, headers: { "Retry-After": "17" } }),
    );
    const requester = new OpenFdaRequester({ fetch });
    const err = (await requester
      .get("drug/event.json")
      .catch((e: unknown) => e)) as OpenFdaApiError;
    expect(err.retryAfterSeconds).toBe(17);
  });

  it("maps a non-JSON 2xx body to OpenFdaError", async () => {
    const { fetch } = recordingFetch(
      () => new Response("<html>hi</html>", { status: 200 }),
    );
    const requester = new OpenFdaRequester({ fetch });
    await expect(requester.get("drug/label.json")).rejects.toThrow(
      OpenFdaError,
    );
  });

  it("maps fetch failures to OpenFdaNetworkError with redaction", async () => {
    const fn = vi.fn((url: string | URL | Request) => {
      void url;
      return Promise.reject(new TypeError("fetch failed"));
    }) as unknown as typeof fetch;
    const requester = new OpenFdaRequester({ fetch: fn, apiKey: "SECRET" });
    const err = (await requester
      .get("drug/label.json")
      .catch((e: unknown) => e)) as OpenFdaNetworkError;
    expect(err).toBeInstanceOf(OpenFdaNetworkError);
    expect(err.url).not.toContain("SECRET");
    expect(err.url).toContain("[redacted]");
    expect((err.cause as TypeError).message).toBe("fetch failed");
  });
});

describe("timeout", () => {
  it("rejects with OpenFdaTimeoutError when the deadline passes", async () => {
    const requester = new OpenFdaRequester({
      fetch: hangingFetch(),
      timeoutMs: 20,
    });
    await expect(requester.get("drug/label.json")).rejects.toThrow(
      OpenFdaTimeoutError,
    );
  });
});

describe("429 retry", () => {
  /** 429 response with a `Retry-After` header (seconds as string). */
  function tooManyRequests(retryAfter?: string) {
    return jsonResponse(
      { error: { code: "TOO_MANY_REQUESTS", message: "rate limited" } },
      {
        status: 429,
        headers: retryAfter === undefined ? {} : { "Retry-After": retryAfter },
      },
    );
  }

  /** Counting fetch mock: 429 for the first `limited` calls, 200 after. */
  function limitedFetch(limited: number, retryAfter?: string) {
    let call = 0;
    const fn = vi.fn(() => {
      call += 1;
      return Promise.resolve(
        call <= limited ? tooManyRequests(retryAfter) : jsonResponse({ ok: 1 }),
      );
    }) as unknown as typeof fetch;
    return { fetch: fn, calls: () => call };
  }

  it("does not retry 429 by default", async () => {
    const { fetch, calls } = limitedFetch(1, "0");
    const requester = new OpenFdaRequester({ fetch });
    await expect(requester.get("drug/label.json")).rejects.toThrow(
      OpenFdaApiError,
    );
    expect(calls()).toBe(1);
  });

  it("retries a 429 when retryOn429 is enabled", async () => {
    const { fetch, calls } = limitedFetch(1, "0");
    const requester = new OpenFdaRequester({ fetch, retryOn429: true });
    await expect(requester.get("drug/label.json")).resolves.toEqual({ ok: 1 });
    expect(calls()).toBe(2);
  });

  it("retries at most maxRetries times, then throws the 429", async () => {
    const { fetch, calls } = limitedFetch(10, "0");
    const requester = new OpenFdaRequester({
      fetch,
      retryOn429: { maxRetries: 2 },
    });
    const err = (await requester
      .get("drug/label.json")
      .catch((e: unknown) => e)) as OpenFdaApiError;
    expect(err).toBeInstanceOf(OpenFdaApiError);
    expect(err.status).toBe(429);
    expect(calls()).toBe(3); // initial attempt + 2 retries
  });

  it("releases the 429 response body before retrying", async () => {
    // An unconsumed body pins the connection until GC — a leak under load.
    const r429 = tooManyRequests("0");
    let call = 0;
    const fn = vi.fn(() => {
      call += 1;
      return Promise.resolve(call === 1 ? r429 : jsonResponse({ ok: 1 }));
    }) as unknown as typeof fetch;
    const requester = new OpenFdaRequester({ fetch: fn, retryOn429: true });
    await expect(requester.get("drug/label.json")).resolves.toEqual({ ok: 1 });
    expect(r429.bodyUsed).toBe(true);
  });

  it("uses an exponential fallback delay when Retry-After is absent", async () => {
    vi.useFakeTimers();
    try {
      const { fetch, calls } = limitedFetch(1); // no Retry-After header
      const requester = new OpenFdaRequester({ fetch, retryOn429: true });
      const pending = requester.get("drug/label.json");
      const done = await vi.advanceTimersByTimeAsync(1000).then(() => pending);
      expect(done).toEqual({ ok: 1 });
      expect(calls()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("caps an oversized Retry-After at 60 seconds", async () => {
    vi.useFakeTimers();
    try {
      const { fetch, calls } = limitedFetch(1, "3600");
      const requester = new OpenFdaRequester({ fetch, retryOn429: true });
      const pending = requester.get("drug/label.json");
      const done = await vi
        .advanceTimersByTimeAsync(60_000)
        .then(() => pending);
      expect(done).toEqual({ ok: 1 });
      expect(calls()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("fetch resolution", () => {
  it("throws OpenFdaError when no fetch is available", () => {
    const original = globalThis.fetch;
    (globalThis as { fetch?: typeof fetch }).fetch = undefined;
    try {
      expect(() => new OpenFdaRequester()).toThrow(OpenFdaError);
    } finally {
      globalThis.fetch = original;
    }
  });
});
