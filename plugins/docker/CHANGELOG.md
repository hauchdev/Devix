# @devix/docker

## 0.1.0

### Minor Changes

- f9767c4: Adds the `@devix/docker` plugin with graceful degradation (`dockerAvailability`, `runningContainers`, `images` returning `undefined` when Docker is unusable) and the `devix docker status|ps|images` commands, which report CLI-missing or daemon-down states with clear one-line messages instead of stack traces.
- First public release: the Devix CLI (`npm i -g devix-cli`) with `status`, `detect`, `doctor`, read-only `git` commands, dependency delegation through the detected package manager, Docker diagnostics with graceful degradation, and the `@devix/*` service packages powering them.

### Patch Changes

- Updated dependencies
  - @devix/shell@0.1.0
