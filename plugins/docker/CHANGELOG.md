# @devix-cli/docker

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
