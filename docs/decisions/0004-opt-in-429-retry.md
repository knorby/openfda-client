# ADR-0004: Opt-in 429 retry honoring Retry-After

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

openFDA rate-limits clients with HTTP 429 responses and (usually) a
`Retry-After` header. The client already parses that header into
`OpenFdaApiError.retryAfterSeconds`, but every consumer that wants
automatic backoff has to write the same sleep-and-retry loop around the
client (a consumer of the pre-release library reported exactly this).
Making retry the default would surprise callers that implement their own
rate-limit strategy or want hard failure semantics.

## Decision

Add an opt-in `retryOn429` option to `OpenFdaClientConfig`:

- `retryOn429: true` retries up to **3** times.
- `retryOn429: { maxRetries: n }` overrides the count (`0` disables).
- Default is **off** — without the option the client throws
  `OpenFdaApiError` on 429 exactly as before.

Wait policy between attempts:

- Honor the `Retry-After` header (seconds or HTTP-date, both already
  parsed), **capped at 60 seconds** so a pathological header cannot park
  a request indefinitely.
- Without the header, exponential backoff (1s, 2s, 4s, …) capped at the
  same 60-second ceiling.
- `timeoutMs` applies **per attempt**, not to the whole retry sequence.

Only 429 responses are retried. Zero-match 404s (`NOT_FOUND`) and other
statuses throw immediately; network failures and timeouts are not
retried.

## Consequences

- Consumers get sensible rate-limit resilience with one option; the
  default behavior is unchanged, so existing callers are unaffected.
- The 60-second cap trades strict header fidelity for predictable
  worst-case latency; callers needing exact Retry-After semantics can
  keep retry off and read `retryAfterSeconds` themselves.
- Retries re-issue the identical GET, so the option is only sound for
  idempotent reads — which is all this client performs.
