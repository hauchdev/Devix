# @devix/doctor

## 0.1.0

### Minor Changes

- aa775bd: Adds the `@devix/doctor` service package: `runDoctor` composes an environment section (Node.js, pnpm, npm, Yarn, Bun, Git with detected versions or `missing` status) and a project section (detected languages, package managers and tools via `@devix/project-detector`). Tool version resolution is injectable via `DoctorServices`, so consumers can test without touching the real system.
- First public release: the Devix CLI (`npm i -g devix-cli`) with `status`, `detect`, `doctor`, read-only `git` commands, dependency delegation through the detected package manager, Docker diagnostics with graceful degradation, and the `@devix/*` service packages powering them.

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
  - @devix/project-detector@0.1.0
  - @devix/filesystem@0.1.0
  - @devix/shell@0.1.0
