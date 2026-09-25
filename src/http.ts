import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS } from "./constants";
import {
  OpenFdaApiError,
  OpenFdaError,
  OpenFdaNetworkError,
  OpenFdaNotFoundError,
  OpenFdaTimeoutError,
} from "./errors";
import { buildQueryString, mergeParams } from "./utils/serialize";

/** Retries performed for a 429 when `retryOn429` is enabled. */
const DEFAULT_MAX_429_RETRIES = 3;
/** Upper bound (seconds) on a wait derived from the `Retry-After` header. */
const MAX_RETRY_AFTER_WAIT_SECONDS = 60;
/** First fallback backoff step when no `Retry-After` header is present. */
const INITIAL_BACKOFF_MS = 1000;

/** Replaces the `api_key` query value with `[redacted]` in a URL. */
function redactApiKey(url: string): string {
  return url.replace(/([?&]api_key=)[^&]*/, "$1[redacted]");
}

/** Resolves after `ms` milliseconds (0 resolves on the next tick). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A `fetch`-compatible function. The openFDA client uses the standard Web
 * `fetch` (native in Node 18+, React Native, browsers, Bun, and Deno) and
 * accepts an override for polyfills, testing, or request interception.
 */
export type FetchLike = typeof globalThis.fetch;

/**
 * Configuration accepted by {@link OpenFdaClient}.
 */
export interface OpenFdaClientConfig {
  /**
   * Base URL for the openFDA API. Defaults to the production endpoint
   * (`https://api.fda.gov`). Override for testing or a proxy.
   */
  baseUrl?: string;
  /**
   * Optional openFDA API key (free from https://open.fda.gov/apis/authentication/).
   * When set, it is appended as the `api_key` query parameter on every
   * request, raising the rate limit from 240 req/min + 1,000/day per IP to
   * 240 req/min + 120,000/day per key. The key is redacted from every error
   * message this client produces.
   */
  apiKey?: string;
  /**
   * Per-request timeout in milliseconds. Requests that exceed this are
   * aborted via `AbortSignal` and reject with a {@link OpenFdaTimeoutError}.
   * @default 30000
   */
  timeoutMs?: number;
  /**
   * Custom `fetch` implementation. Inject a polyfill in older runtimes, a
   * `vi.fn`/mock in tests, or a wrapper that adds auth/telemetry.
   */
  fetch?: FetchLike;
  /**
   * Extra headers merged into every request (e.g. `User-Agent`).
   * Keys are case-insensitive per the `Headers` spec.
   */
  headers?: Record<string, string>;
  /**
   * Default `User-Agent` header. Some servers/proxies require one. Defaults
   * to `@knorby/openfda-client/<version>`; the version is resolved at
   * build time when available.
   *
   * @note Browsers treat `User-Agent` as a forbidden header and silently
   *   strip it, so the value is only sent in runtimes that allow setting
   *   it (Node, Bun, Deno, React Native).
   */
  userAgent?: string;
  /**
   * Opt-in automatic retry for `429` (rate-limit) responses.
   *
   * - `true` retries up to 3 times.
   * - `{ maxRetries: n }` overrides the retry count (`0` disables).
   *
   * The wait between attempts honors the response's `Retry-After` header
   * (seconds or HTTP-date), capped at 60 seconds; without the header it
   * falls back to exponential backoff (1s, 2s, 4s, …), also capped at
   * 60 seconds. `timeoutMs` applies per attempt, not to the total.
   * Off by default: callers with their own rate-limit strategy can rely
   * on {@link OpenFdaApiError.retryAfterSeconds} instead.
   *
   * @default false
   */
  retryOn429?: boolean | { maxRetries?: number };
}

/** Package version, injected at build time by tsup's `define` config. */
declare const PKG_VERSION: string | undefined;

const CLIENT_USER_AGENT = `@knorby/openfda-client/${
  typeof PKG_VERSION !== "undefined" ? PKG_VERSION : "0.0.0"
}`;

/**
 * Low-level openFDA HTTP requester. Holds shared config and exposes a single
 * `get` method that builds the URL, applies the timeout, performs the
 * `fetch`, and maps failures to typed errors.
 */
export class OpenFdaRequester {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchLike;
  private readonly headers: Record<string, string>;
  private readonly userAgent: string;
  /** Max 429 retries; `0` disables retrying. */
  private readonly max429Retries: number;

  constructor(config: OpenFdaClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = config.userAgent ?? CLIENT_USER_AGENT;
    this.headers = { ...config.headers };
    const retry429 = config.retryOn429;
    this.max429Retries =
      retry429 === true
        ? DEFAULT_MAX_429_RETRIES
        : retry429 && typeof retry429 === "object"
          ? (retry429.maxRetries ?? DEFAULT_MAX_429_RETRIES)
          : 0;

    // Typed as always-present, but absent in runtimes without global `fetch`.
    const globalFetch = globalThis.fetch as FetchLike | undefined;
    // A detached `globalThis.fetch` throws `TypeError: Illegal invocation` in
    // browsers (Web IDL requires the global receiver), so bind it. Injected
    // implementations are used as-is.
    const fetchImpl = config.fetch ?? globalFetch?.bind(globalThis);
    if (typeof fetchImpl !== "function") {
      throw new OpenFdaError(
        "No `fetch` implementation available. This runtime does not expose a global `fetch`. " +
          "Pass one via the client config, e.g. `new OpenFdaClient({ fetch: myFetch })`.",
      );
    }
    this.fetchFn = fetchImpl;
  }

  /**
   * Performs a `GET` request and returns the parsed JSON body.
   *
   * An empty 2xx body resolves to `null`; a non-JSON 2xx body rejects.
   *
   * @param path Path with suffix relative to the base URL (e.g.
   *   `"drug/label.json"`).
   * @param params Query parameters (serialized by {@link buildQueryString}).
   * @throws {OpenFdaTimeoutError} when the request exceeds `timeoutMs`.
   * @throws {OpenFdaNotFoundError} for the API's 404-with-`NOT_FOUND`
   *   response (zero matching records).
   * @throws {OpenFdaApiError} for any other non-2xx response.
   * @throws {OpenFdaError} for a 2xx response with a non-JSON body.
   * @throws {OpenFdaNetworkError} for a transport-level failure.
   */
  async get<TR>(path: string, params?: object): Promise<TR> {
    const url = this.buildUrl(path, params);

    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchFn(url, {
          method: "GET",
          headers: this.buildHeaders(),
          signal: controller.signal,
        });
        // Rate-limited: sleep (Retry-After or exponential backoff), retry.
        if (response.status === 429 && attempt < this.max429Retries) {
          // Release the unread body so the connection is not pinned until GC.
          await response.body?.cancel();
          const waitMs = this.retryDelayMs(
            attempt,
            response.headers.get("Retry-After"),
          );
          await sleep(waitMs);
          continue;
        }
        return (await this.parseBody(response, url)) as TR;
      } catch (err) {
        if (controller.signal.aborted && !(err instanceof OpenFdaError)) {
          throw new OpenFdaTimeoutError(this.timeoutMs);
        }
        if (err instanceof OpenFdaError) throw err;
        throw new OpenFdaNetworkError(redactApiKey(url), err);
      } finally {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Milliseconds to wait before 429 retry `attempt` (0-based): the parsed
   * `Retry-After` value when present (capped), else exponential backoff
   * (1s, 2s, 4s, …) capped at the same ceiling.
   */
  private retryDelayMs(attempt: number, retryAfter: string | null): number {
    const capMs = MAX_RETRY_AFTER_WAIT_SECONDS * 1000;
    const seconds = this.parseRetryAfter(retryAfter);
    if (seconds !== undefined) {
      return Math.min(seconds * 1000, capMs);
    }
    return Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, capMs);
  }

  private buildUrl(path: string, params?: object): string {
    const cleanPath = path.replace(/^\/+/, "");
    const base = `${this.baseUrl}/${cleanPath}`;
    const allParams = mergeParams(
      params,
      this.apiKey ? { api_key: this.apiKey } : {},
    );
    const qs = buildQueryString(allParams);
    return qs ? `${base}?${qs}` : base;
  }

  private buildHeaders(): Headers {
    const headers = new Headers(this.headers);
    headers.set("Accept", "application/json");
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", this.userAgent);
    }
    return headers;
  }

  private async parseBody(response: Response, url: string): Promise<unknown> {
    const bodyText = await response.text();
    if (!response.ok) {
      const { code } = parseErrorBody(bodyText);
      if (response.status === 404 && code === "NOT_FOUND") {
        // openFDA signals "zero matching records" as 404 NOT_FOUND rather
        // than an empty result set. Redacted so logged errors cannot leak
        // the caller's openFDA key.
        throw new OpenFdaNotFoundError(redactApiKey(url));
      }
      const retryAfterSeconds = this.parseRetryAfter(
        response.headers.get("Retry-After"),
      );
      throw new OpenFdaApiError({
        status: response.status,
        body: bodyText,
        code,
        retryAfterSeconds,
        // Redacted so logged errors cannot leak the caller's openFDA key.
        url: redactApiKey(url),
      });
    }
    if (bodyText === "") return null;
    try {
      return JSON.parse(bodyText);
    } catch {
      const contentType = response.headers.get("content-type") ?? "unknown";
      throw new OpenFdaError(
        `openFDA API returned a non-JSON body (${contentType}): ${bodyText.slice(0, 120)}`,
      );
    }
  }

  private parseRetryAfter(value: string | null): number | undefined {
    if (value === null) return undefined;
    // Numeric form: seconds.
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;
    // HTTP-date form: compute seconds from now.
    const date = Date.parse(value);
    if (Number.isNaN(date)) return undefined;
    return Math.max(0, Math.round((date - Date.now()) / 1000));
  }
}

/**
 * Extracts `{"error":{"code":…}}` from an error body, if the body is JSON in
 * that shape. Returns an empty `code` otherwise (HTML error pages, proxies,
 * etc.).
 */ function parseErrorBody(bodyText: string): { code: string | undefined } {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "error" in parsed &&
      (parsed as { error: unknown }).error !== null &&
      typeof (parsed as { error: unknown }).error === "object" &&
      "code" in (parsed as { error: Record<string, unknown> }).error &&
      typeof (parsed as { error: { code: unknown } }).error.code === "string"
    ) {
      return { code: (parsed as { error: { code: string } }).error.code };
    }
  } catch {
    // Not JSON — leave the code undefined.
  }
  return { code: undefined };
}
