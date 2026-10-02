# @devix-cli/deps

## 1.0.0

### Patch Changes

- fb6b111: Quality work driven by the new coverage floors.

  **Docker** is now testable without a daemon: the CLI logic moved into a `DockerClient` over an injectable `DockerRunner`, and the command handlers accept an injected client. Coverage went from 32% to 96%, and the tests no longer depend on whether the machine happens to have Docker.

  **Doctor** gained an injectable probe runner, so version parsing is covered deterministically instead of only against the real machine.

  **Git** `diffStat` now reports `0` instead of `NaN` when a `--numstat` count column is missing or unparseable.

- Updated dependencies [493c8d9]
- Updated dependencies [46294ed]
  - @devix-cli/project-detector@1.0.0

## 0.2.0

### Patch Changes

- Updated dependencies
  - @devix-cli/project-detector@0.2.0

## 0.1.0

### Minor Changes

- First public release: the Devix CLI (`npm i -g devix-cli`) with `status`, `detect`, `doctor`, read-only `git` commands, dependency delegation through the detected package manager, Docker diagnostics with graceful degradation, and the `@devix-cli/*` service packages powering them.

### Patch Changes

- Updated dependencies [b4cb6b8]
- Updated dependencies [3dff093]
- Updated dependencies [74372b7]
- Updated dependencies
- Updated dependencies [74372b7]
- Updated dependencies [74372b7]
- Updated dependencies [74372b7]
- Updated dependencies [18b5e8e]
- Updated dependencies [74372b7]
- Updated dependencies [74372b7]
  - @devix-cli/project-detector@0.1.0
  - @devix-cli/filesystem@0.1.0
  - @devix-cli/shell@0.1.0
