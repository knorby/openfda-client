---
"@knorby/openfda-client": minor
---

Add an opt-in `retryOn429` client option for automatic rate-limit
retries: `true` retries up to 3 times, `{ maxRetries: n }` overrides the
count. Waits honor the `Retry-After` header (capped at 60 seconds) and
fall back to exponential backoff otherwise; `timeoutMs` applies per
attempt. Off by default — see ADR-0004.
