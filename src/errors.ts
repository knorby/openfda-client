/**
 * Base class for every error thrown by the openFDA client.
 *
 * All client errors extend this class, so `instanceof OpenFdaError` is a
 * reliable way to distinguish API failures from unrelated runtime errors.
 */
export class OpenFdaError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OpenFdaError";
    // Restore prototype chain after a super() call with options (TS quirk).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * A timeout error, raised when a request exceeds the configured
 * `timeoutMs` and is aborted via `AbortSignal`.
 */
export class OpenFdaTimeoutError extends OpenFdaError {
  /** The configured timeout in milliseconds. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`openFDA request timed out after ${timeoutMs}ms`);
    this.name = "OpenFdaTimeoutError";
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * A non-2xx response from the openFDA API.
 *
 * openFDA reports structured failures as JSON bodies of the form
 * `{"error":{"code":"…","message":"…"}}`; when present, the machine code is
 * surfaced on {@link OpenFdaApiError.code}. The most common codes are
 * `NOT_FOUND` (zero matching records — see {@link OpenFdaNotFoundError}),
 * `INVALID_QUERY` (malformed `search` syntax), and `API_KEY_REQUIRED`
 * (when the daily anonymous quota is exhausted or the endpoint requires a
 * key). `429` is returned when a caller exceeds the rate limit; for those
 * responses `retryAfterSeconds` carries the recommended back-off (parsed
 * from the `Retry-After` header when present).
 */
export class OpenFdaApiError extends OpenFdaError {
  /** HTTP status code returned by the server. */
  readonly status: number;
  /** Response body for debugging, with the configured API key redacted. */
  readonly body: string;
  /** Machine-readable error code from the API's `{"error":{"code":…}}` body. */
  readonly code: string | undefined;
  /**
   * Parsed `Retry-After` header value in seconds, when present (typically on
   * `429` responses). `undefined` when the header is absent or unparsable.
   */
  readonly retryAfterSeconds: number | undefined;
  /**
   * The URL that was requested, with the `api_key` query value redacted so
   * logging the error cannot leak the caller's openFDA key.
   */
  readonly url: string;

  constructor(params: {
    status: number;
    body: string;
    code?: string;
    retryAfterSeconds?: number;
    url: string;
  }) {
    const codeText = params.code !== undefined ? ` [${params.code}]` : "";
    const retryText =
      params.retryAfterSeconds !== undefined
        ? ` (retry after ${params.retryAfterSeconds}s)`
        : "";
    super(
      `openFDA API error ${params.status}${codeText}${retryText} for ${params.url}`,
    );
    this.name = "OpenFdaApiError";
    this.status = params.status;
    this.body = params.body;
    this.code = params.code;
    this.retryAfterSeconds = params.retryAfterSeconds;
    this.url = params.url;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * The distinctive openFDA behavior where a search that matches **zero**
 * records is reported as HTTP 404 with body
 * `{"error":{"code":"NOT_FOUND","message":"No matches found!"}}` — not as an
 * empty result set.
 *
 * This error preserves that API semantics while making it ergonomic to
 * handle: catch `OpenFdaNotFoundError` to treat "no matches" as a normal
 * outcome (e.g. resolve to `[]`), and let other `OpenFdaApiError`s (bad
 * query syntax, missing endpoint, …) surface as failures.
 */
export class OpenFdaNotFoundError extends OpenFdaApiError {
  constructor(url: string) {
    super({
      status: 404,
      body: '{"error":{"code":"NOT_FOUND","message":"No matches found!"}}',
      code: "NOT_FOUND",
      url,
    });
    this.name = "OpenFdaNotFoundError";
    this.message = `openFDA: no matches found for ${url}`;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Raised when a network-level failure prevents the request from completing
 * (DNS failure, connection reset, etc.). A sanitized copy of the transport
 * error is attached as `cause` to avoid leaking a key from its nested stack.
 */
export class OpenFdaNetworkError extends OpenFdaError {
  /**
   * The URL that was requested, with the `api_key` query value redacted so
   * logging the error cannot leak the caller's openFDA key.
   */
  readonly url: string;

  constructor(url: string, cause: unknown) {
    super(`openFDA network failure for ${url}`, { cause });
    this.name = "OpenFdaNetworkError";
    this.url = url;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
