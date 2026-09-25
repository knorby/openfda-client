---
"@knorby/openfda-client": patch
---

`searchAll` now validates `pageSize` eagerly, throwing `RangeError` at
call time instead of lazily on the generator's first `next()`.
