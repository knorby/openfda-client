---
"@knorby/openfda-client": patch
---

Prevent configured API keys from appearing in client-generated error bodies and
network causes, and reject invalid 429 retry counts rather than silently
disabling or retrying without a finite bound.
