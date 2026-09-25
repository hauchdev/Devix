# @devix-cli/config

## 0.1.0

### Minor Changes

- First public release: the Devix CLI (`npm i -g devix-cli`) with `status`, `detect`, `doctor`, read-only `git` commands, dependency delegation through the detected package manager, Docker diagnostics with graceful degradation, and the `@devix-cli/*` service packages powering them.

### Patch Changes

- 915539a: Adds the `@devix-cli/config` package: Devix configuration loading with upward search (`devix.config.json` / `devix.json`), strict JSON without code execution, shape validation that rejects unknown keys, and typed errors (`ConfigError`: `EPARSE`, `EINVALID_CONFIG`, `EUNSUPPORTED_FORMAT`, `EIO`). A missing config file is a normal result (`undefined`).
- Updated dependencies
  - @devix-cli/filesystem@0.1.0
