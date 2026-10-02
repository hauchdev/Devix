# @devix-cli/docker

## 1.0.0

### Minor Changes

- fb6b111: Quality work driven by the new coverage floors.

  **Docker** is now testable without a daemon: the CLI logic moved into a `DockerClient` over an injectable `DockerRunner`, and the command handlers accept an injected client. Coverage went from 32% to 96%, and the tests no longer depend on whether the machine happens to have Docker.

  **Doctor** gained an injectable probe runner, so version parsing is covered deterministically instead of only against the real machine.

  **Git** `diffStat` now reports `0` instead of `NaN` when a `--numstat` count column is missing or unparseable.

- cf65db9: Migrate `devix docker` and the read-only `devix minecraft list|check|run` subcommands to plugin-contributed handlers loaded through the capability registry. The `init` subcommand remains in the CLI because it depends on interactive prompts. Added `CommandHandler` and `CommandHandlers` types to `@devix-cli/output`.
- 209833e: Docker and Minecraft manifests now declare `capabilities.commands` with `apiVersion: "1"`. `devix plugin list` merges capability commands with the legacy top-level `commands` array.

### Patch Changes

- Updated dependencies [048d318]
- Updated dependencies [cf65db9]
- Updated dependencies [45f5cc9]
- Updated dependencies [6e9c4f7]
  - @devix-cli/core@1.0.0
  - @devix-cli/output@1.0.0

## 0.1.1

### Patch Changes

- 3a98d3f: Advertised versions no longer drift from releases: `DEVIX_VERSION` and the docker plugin version are now read from each package's own manifest instead of hardcoded literals. Docker plugin tests get generous timeouts and concurrent probes so slow Windows CI runners no longer time out.

## 0.1.0

### Minor Changes

- f9767c4: Adds the `@devix-cli/docker` plugin with graceful degradation (`dockerAvailability`, `runningContainers`, `images` returning `undefined` when Docker is unusable) and the `devix docker status|ps|images` commands, which report CLI-missing or daemon-down states with clear one-line messages instead of stack traces.
- First public release: the Devix CLI (`npm i -g devix-cli`) with `status`, `detect`, `doctor`, read-only `git` commands, dependency delegation through the detected package manager, Docker diagnostics with graceful degradation, and the `@devix-cli/*` service packages powering them.

### Patch Changes

- Updated dependencies
  - @devix-cli/shell@0.1.0
