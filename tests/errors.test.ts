import { describe, expect, it } from "vitest";
import {
  OpenFdaApiError,
  OpenFdaError,
  OpenFdaNetworkError,
  OpenFdaNotFoundError,
  OpenFdaTimeoutError,
} from "../src/errors";

describe("OpenFdaError", () => {
  it("is an Error with the correct name", () => {
    const err = new OpenFdaError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(OpenFdaError);
    expect(err.name).toBe("OpenFdaError");
    expect(err.message).toBe("boom");
  });
});

describe("OpenFdaTimeoutError", () => {
  it("carries the timeout and message", () => {
    const err = new OpenFdaTimeoutError(30000);
    expect(err).toBeInstanceOf(OpenFdaError);
    expect(err.name).toBe("OpenFdaTimeoutError");
    expect(err.timeoutMs).toBe(30000);
    expect(err.message).toContain("30000ms");
  });
});

describe("OpenFdaApiError", () => {
  it("carries status, body, url, and parsed Retry-After", () => {
    const err = new OpenFdaApiError({
      status: 429,
      body: "rate limited",
      retryAfterSeconds: 17,
      url: "https://api.fda.gov/drug/label.json?api_key=[redacted]",
    });
    expect(err).toBeInstanceOf(OpenFdaError);
    expect(err.name).toBe("OpenFdaApiError");
    expect(err.status).toBe(429);
    expect(err.body).toBe("rate limited");
    expect(err.retryAfterSeconds).toBe(17);
    expect(err.url).toContain("[redacted]");
    expect(err.message).toContain("429");
    expect(err.message).toContain("retry after 17s");
  });

  it("omits the retry suffix when Retry-After is absent", () => {
    const err = new OpenFdaApiError({
      status: 500,
      body: "",
      url: "https://api.fda.gov/drug/event.json",
    });
    expect(err.retryAfterSeconds).toBeUndefined();
    expect(err.message).not.toContain("retry after");
  });

  it("carries the parsed API error code when provided", () => {
    const err = new OpenFdaApiError({
      status: 400,
      body: '{"error":{"code":"INVALID_QUERY"}}',
      code: "INVALID_QUERY",
      url: "https://api.fda.gov/drug/event.json",
    });
    expect(err.code).toBe("INVALID_QUERY");
    expect(err.message).toContain("INVALID_QUERY");
  });
});

describe("OpenFdaNotFoundError", () => {
  it("is an OpenFdaApiError and an OpenFdaError with code NOT_FOUND", () => {
    const err = new OpenFdaNotFoundError("https://api.fda.gov/drug/label.json?api_key=[redacted]");
    expect(err).toBeInstanceOf(OpenFdaApiError);
    expect(err).toBeInstanceOf(OpenFdaError);
    expect(err.name).toBe("OpenFdaNotFoundError");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.url).toContain("[redacted]");
    expect(err.message).toContain("no matches found");
  });
});

describe("OpenFdaNetworkError", () => {
  it("wraps the cause and redacts nothing itself", () => {
    const cause = new TypeError("fetch failed");
    const err = new OpenFdaNetworkError("https://api.fda.gov/drug/event.json", cause);
    expect(err).toBeInstanceOf(OpenFdaError);
    expect(err.name).toBe("OpenFdaNetworkError");
    expect(err.cause).toBe(cause);
    expect(err.url).toBe("https://api.fda.gov/drug/event.json");
  });
});

describe("prototype chain survives throw/catch", () => {
  it("still instanceof OpenFdaError after being thrown", () => {
    expect(() => {
      throw new OpenFdaApiError({
        status: 503,
        body: "",
        url: "https://api.fda.gov/food/enforcement.json",
      });
    }).toThrow(OpenFdaError);
  });
});
