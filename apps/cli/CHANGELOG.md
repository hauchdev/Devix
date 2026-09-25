# devix-cli

## 0.3.2

### Patch Changes

- `devix minecraft init` now creates a project subfolder named after the project (kebab-case) inside the target directory instead of scattering files into it, with `--here` to keep scaffolding directly into the directory. The folder name and next steps are shown in the command output.

## 0.3.0

### Minor Changes

- Adds the `@devix-cli/minecraft` plugin: scaffolds Minecraft mod and plugin skeletons for eight platforms — fabric, forge, architectury (multi-loader common+fabric+forge), spigot, paper, folia, velocity and bungeecord — via the new `devix minecraft list` and `devix minecraft init` commands. Scaffolding never overwrites existing files (fails with `EEXISTS` unless `overwrite` is set, and then only skips), supports `--dry-run`, `--package`, `--mc` and `--json`, and the plugin appears in `devix plugin list`.

### Patch Changes

- Updated dependencies
  - @devix-cli/minecraft@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies
  - @devix-cli/project-detector@0.2.0
  - @devix-cli/deps@0.2.0
  - @devix-cli/doctor@0.2.0

## 0.1.1

### Patch Changes

- 3a98d3f: Advertised versions no longer drift from releases: `DEVIX_VERSION` and the docker plugin version are now read from each package's own manifest instead of hardcoded literals. Docker plugin tests get generous timeouts and concurrent probes so slow Windows CI runners no longer time out.
- Updated dependencies [3a98d3f]
  - @devix-cli/core@0.1.1
  - @devix-cli/docker@0.1.1

## 0.1.0

### Minor Changes

- 1a15639: Adds the first Devix CLI (`@devix-cli/cli`) with the `devix detect` command: detects the current project's languages, package managers and tools via `@devix-cli/project-detector`, with `--json` and `--cwd` flags. `devix --version` and `devix --help` are available from the `bin/run.js` entry.
- aa775bd: Adds the `devix doctor` command: diagnoses the environment (tool versions with ✓/✗ marks) and the current project (detected stack), with `--json` and `--cwd` flags.
- 6f89940: Adds read-only `devix git` commands: `status` (branch and changed paths with short codes), `branches` (local branches with the current one marked) and `diff` (per-file line counts against HEAD), all with `--cwd` and clear one-line errors outside repositories.
- f9767c4: Adds the `@devix-cli/docker` plugin with graceful degradation (`dockerAvailability`, `runningContainers`, `images` returning `undefined` when Docker is unusable) and the `devix docker status|ps|images` commands, which report CLI-missing or daemon-down states with clear one-line messages instead of stack traces.
- First public release: the Devix CLI (`npm i -g devix-cli`) with `status`, `detect`, `doctor`, read-only `git` commands, dependency delegation through the detected package manager, Docker diagnostics with graceful degradation, and the `@devix-cli/*` service packages powering them.
- dded4f3: Adds `devix status`: one read-only glance combining project detection, environment tool checks, git ahead/behind and docker availability, with a `--json` flag. The package is now installable globally (`pnpm add -g` from `apps/cli`, or `pnpm link` from the repository) so `devix` runs directly in cmd, PowerShell and POSIX shells; see the README for the exact commands.
- b0e371a: Adds a minimal plugin API to `@devix-cli/core`: `PluginRegistry` validates `PluginManifest` metadata (id, name, semantic version, description, declared commands) and rejects duplicates. The API is metadata-only and never loads dynamic code. The CLI gains `devix plugin list`, which lists the builtin plugins (docker) through that registry with a `--json` flag.

### Patch Changes

- Updated dependencies [b4cb6b8]
- Updated dependencies [3dff093]
- Updated dependencies [74372b7]
- Updated dependencies [f9767c4]
- Updated dependencies [aa775bd]
- Updated dependencies
- Updated dependencies [74372b7]
- Updated dependencies [6f89940]
- Updated dependencies [74372b7]
- Updated dependencies [74372b7]
- Updated dependencies [18b5e8e]
- Updated dependencies [b0e371a]
- Updated dependencies [74372b7]
- Updated dependencies [74372b7]
  - @devix-cli/project-detector@0.1.0
  - @devix-cli/docker@0.1.0
  - @devix-cli/doctor@0.1.0
  - @devix-cli/core@0.1.0
  - @devix-cli/git@0.1.0
  - @devix-cli/deps@0.1.0
