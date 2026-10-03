# devix-cli

## 1.1.0

### Minor Changes

- c11f700: Make a bare `devix` an introduction instead of a command reference.

  Running `devix` with no arguments printed oclif's help text: a list of
  what exists, with no idea where the user actually is. It now opens a
  panel that answers the question a newcomer has first — what is this
  directory, is my environment healthy, what do I do next — and suggests
  only the commands that apply to what it found. A clean environment gets
  no "run doctor anyway" noise; an unpushed branch gets `git sync` at the
  top. `devix home` reaches the same panel by name, `--json` emits the same
  snapshot as data, `--verbose` adds the detection tree, and `--help` and
  `--version` still belong to oclif.

  The layout comes from the new `Deck` primitives in `@devix-cli/ui`, so
  the panel degrades the same way the rest of the CLI does: ASCII and no
  color on a legacy console, stacked cards on a narrow terminal, and a
  meter that drops to plain counts when a bar would not fit. Each probe is
  individually optional — no repository, no Docker and missing tools are
  all rendered as facts, because a welcome screen that fails is worse than
  one that admits it does not know.

### Patch Changes

- Updated dependencies [c11f700]
- Updated dependencies [701f911]
  - @devix-cli/ui@0.3.0

## 1.0.0

### Major Changes

- b0dfbc8: Rework the entire terminal interface.

  **New `@devix-cli/ui` package** with zero dependencies: capability detection (color level, Unicode support, clamped width), a restrained 256-color theme, and layout components (title, heading, fields, table, panel, list, hint).

  **Every console is supported.** Color follows `FORCE_COLOR`/`NO_COLOR`/`TERM`/`COLORTERM`/TTY. Unicode follows the locale on Unix and the emulator on Windows, where legacy consoles still mangle box drawing. Narrow terminals from 32 to 100 columns are handled: long values truncate, tables shrink their widest column but never below a column's longest token, so identifiers stay readable.

  **All commands migrated** to the new renderer: `status`, `doctor`, `detect`, `git status|branches|diff|sync`, `deps`, `docker`, `minecraft`, `web`, `config` and `plugin list`. Every command now shares the same flags: `--json`, `--cwd`, `--no-color`, `--quiet`, `--verbose`, `--config`.

  > **Breaking change:** human-readable output is now a designed layout instead of ad-hoc `Label: value` lines. Scripts parsing stdout should use `--json`.

### Minor Changes

- d6fb0e7: `devix minecraft init` is now interactive on a terminal: when the platform or name is left out, it shows a numbered platform list and asks for a project name, re-prompting on invalid answers. Scripts are unaffected — pass both arguments as before, since non-interactive input and `--json` runs still require them explicitly (piped stdin is rejected with the usage message instead of hanging, because oclif leaks it into the first positional argument).
- 493c8d9: Adds `devix minecraft check [platform]`: detects existing Minecraft mod/plugin projects from the directory tree, listing every platform found with its manifest detail (or `isMinecraft: false` outside Minecraft projects). With a platform id it also reports whether that specific platform matched. `devix doctor` now shows a `Minecraft:` section when platforms are detected.
- 3ea5613: Add `devix config get|set|list|path` to read and write the Devix configuration. `@devix-cli/config` gains `findConfigPath`, `getConfigValue`, `setConfigValue`, `listConfig` and `writeConfig`, with dotted key paths for nested keys and schema validation on every write.
- 132c9ec: Introduce `DevixCommand`, a base command class with shared flags (`--json`, `--cwd`, `--no-color`, `--quiet`, `--verbose`, `--config`) and helpers to emit the canonical `{ ok, data | error }` output shape. Switched internal CLI dependencies to `workspace:*`.
- cf65db9: Migrate `devix docker` and the read-only `devix minecraft list|check|run` subcommands to plugin-contributed handlers loaded through the capability registry. The `init` subcommand remains in the CLI because it depends on interactive prompts. Added `CommandHandler` and `CommandHandlers` types to `@devix-cli/output`.
- 3d67519: Rewrites `devix minecraft init` as a kind-first, fully scriptable scaffolding flow with multi-loader, multi-module and multi-version support.

  **Interactive flow (TTY).** `devix minecraft init` now asks, in order: the project kind (mod / plugin / proxy-plugin), the target platform(s) as a multi-select, the optional extra modules, then the project name, project version, Minecraft version and Java package. Every question is skippable by passing the value as an argument or flag, so scripts keep working without prompts.

  **Multi-loader.** Gradle mod loaders combine into one project via `fabric+forge`, `fabric+neoforge` or the triple: one shared version catalog in `gradle.properties`, a `common` source set, and one subproject per loader with its own manifest (`fabric.mod.json`, `mods.toml`, `neoforge.mods.toml`) and entrypoint delegating to the shared code. Maven platforms stay single-loader and are rejected in combinations.

  **Multi-module.** New `--modules api,core,game-tests,datagen` flag (and API option) adds extra subprojects: `api` (public API), `core` (implementation split), plus `game-tests` and `datagen` for mod loaders. Any module turns the project into a Gradle multi-project or a Maven reactor; the entrypoint stays at the root and extras are wired through `settings.gradle` / parent pom.

  **Multi-version.** New `--mc` version catalog: dependency lines are keyed by Minecraft version (`26.3`, `26.1`, `1.21.11`, `1.21.1`, `1.20.1`) with aliases (`stable`, `legacy`) and drop names (`wilderness`); every generated build resolves its dependencies from `gradle.properties`, never hardcoded. Unsupported combinations fail with `EUNSUPPORTED_VERSION`, and unknown versions with `EUNKNOWN_VERSION`. Architectury now picks its second loader from the version — NeoForge on modern lines, Forge on legacy ones.

  **New platform.** Adds `neoforge` scaffolding (NeoGradle userdev, `neoforge.mods.toml`, `@Mod` main class), bringing the catalog to nine platforms grouped by the new kind taxonomy (`mod`, `plugin`, `proxy-plugin`) exposed through `MINECRAFT_PROJECT_KINDS`, `MINECRAFT_MODULES`, `MINECRAFT_VERSIONS` and enriched `devix minecraft list` / `--json` output.

- 0287f78: Add `devix minecraft run`, a print-first command that recommends how to launch a scaffolded project. It detects the platform, checks for the Gradle wrapper and suggests `./gradlew runClient`, `./gradlew runServer` or `./gradlew build` depending on the project kind.
- 6e9c4f7: Add a plugin command registry in the CLI that discovers commands from plugin capability manifests. Exported capability types from `@devix-cli/core` so consumers can reference them.
- 654b33a: Add the `web` plugin and `devix web`. Subcommands: `detect` (frameworks and whether they are static), `env` (variable **names** only, never values), `scripts`, `build` and `serve` (both print-first) and `doctor`. Includes a dependency-free, read-only static file server with path-traversal protection.

### Patch Changes

- 209833e: Docker and Minecraft manifests now declare `capabilities.commands` with `apiVersion: "1"`. `devix plugin list` merges capability commands with the legacy top-level `commands` array.
- Updated dependencies [3ea5613]
- Updated dependencies [048d318]
- Updated dependencies [fb6b111]
- Updated dependencies [bc2574d]
- Updated dependencies [493c8d9]
- Updated dependencies [cf65db9]
- Updated dependencies [493c8d9]
- Updated dependencies [3d67519]
- Updated dependencies [f216a72]
- Updated dependencies [0287f78]
- Updated dependencies [48d5fae]
- Updated dependencies [45f5cc9]
- Updated dependencies [209833e]
- Updated dependencies [6e9c4f7]
- Updated dependencies [493c8d9]
- Updated dependencies [b0dfbc8]
- Updated dependencies [46294ed]
- Updated dependencies [654b33a]
  - @devix-cli/config@1.0.0
  - @devix-cli/core@1.0.0
  - @devix-cli/docker@1.0.0
  - @devix-cli/doctor@1.0.0
  - @devix-cli/git@1.0.0
  - @devix-cli/deps@1.0.0
  - @devix-cli/minecraft@1.0.0
  - @devix-cli/output@1.0.0
  - @devix-cli/project-detector@1.0.0
  - @devix-cli/ui@0.2.0
  - @devix-cli/web@1.0.0

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
