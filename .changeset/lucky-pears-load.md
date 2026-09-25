---
"@devix/config": patch
---

Adds the `@devix/config` package: Devix configuration loading with upward search (`devix.config.json` / `devix.json`), strict JSON without code execution, shape validation that rejects unknown keys, and typed errors (`ConfigError`: `EPARSE`, `EINVALID_CONFIG`, `EUNSUPPORTED_FORMAT`, `EIO`). A missing config file is a normal result (`undefined`).
