# @devix-cli/minecraft

## 1.1.0

### Minor Changes

- 838abd7: Add an interactive menu engine and deepen the Minecraft workflow.

  `@devix-cli/ui` gains `runMenu`: a keyboard-navigable list with arrow
  keys, Enter to pick, Escape or Ctrl+C to cancel, and typing to filter.
  It buffers its input, because one `data` event can carry several keys and
  treating a chunk as a single key swallows the Enter after a typed filter.
  Off a TTY it degrades to a numbered list, so the same command works in a
  pipe and in CI.

  `devix minecraft` with no operation on a TTY now asks which one to run
  instead of erroring. Two commands join the workflow: `doctor` diagnoses
  an existing project (platform, build wrapper, wrapper jar, Java
  toolchain, catalog version) and `build`/`clean` print the task to run,
  distinct from `run` which launches the game. Every check degrades to a
  warning with a hint rather than throwing, and the Java probe is injected
  from the CLI so the plugin keeps its dependency set and stays testable
  without a JDK.

## 1.0.0

### Minor Changes

- cf65db9: Migrate `devix docker` and the read-only `devix minecraft list|check|run` subcommands to plugin-contributed handlers loaded through the capability registry. The `init` subcommand remains in the CLI because it depends on interactive prompts. Added `CommandHandler` and `CommandHandlers` types to `@devix-cli/output`.
- 493c8d9: Scaffolding now refuses destinations that already look like a Minecraft project (any platform detector matched) with `EINVALID_INPUT`, instead of half-filling an existing mod/plugin with a second one. Pass `allowExistingProject: true` to continue; dry-runs always proceed and note the detection. The scaffold result also carries `targetPlatforms`, the platforms the destination had before writing.
- 3d67519: Rewrites `devix minecraft init` as a kind-first, fully scriptable scaffolding flow with multi-loader, multi-module and multi-version support.

  **Interactive flow (TTY).** `devix minecraft init` now asks, in order: the project kind (mod / plugin / proxy-plugin), the target platform(s) as a multi-select, the optional extra modules, then the project name, project version, Minecraft version and Java package. Every question is skippable by passing the value as an argument or flag, so scripts keep working without prompts.

  **Multi-loader.** Gradle mod loaders combine into one project via `fabric+forge`, `fabric+neoforge` or the triple: one shared version catalog in `gradle.properties`, a `common` source set, and one subproject per loader with its own manifest (`fabric.mod.json`, `mods.toml`, `neoforge.mods.toml`) and entrypoint delegating to the shared code. Maven platforms stay single-loader and are rejected in combinations.

  **Multi-module.** New `--modules api,core,game-tests,datagen` flag (and API option) adds extra subprojects: `api` (public API), `core` (implementation split), plus `game-tests` and `datagen` for mod loaders. Any module turns the project into a Gradle multi-project or a Maven reactor; the entrypoint stays at the root and extras are wired through `settings.gradle` / parent pom.

  **Multi-version.** New `--mc` version catalog: dependency lines are keyed by Minecraft version (`26.3`, `26.1`, `1.21.11`, `1.21.1`, `1.20.1`) with aliases (`stable`, `legacy`) and drop names (`wilderness`); every generated build resolves its dependencies from `gradle.properties`, never hardcoded. Unsupported combinations fail with `EUNSUPPORTED_VERSION`, and unknown versions with `EUNKNOWN_VERSION`. Architectury now picks its second loader from the version — NeoForge on modern lines, Forge on legacy ones.

  **New platform.** Adds `neoforge` scaffolding (NeoGradle userdev, `neoforge.mods.toml`, `@Mod` main class), bringing the catalog to nine platforms grouped by the new kind taxonomy (`mod`, `plugin`, `proxy-plugin`) exposed through `MINECRAFT_PROJECT_KINDS`, `MINECRAFT_MODULES`, `MINECRAFT_VERSIONS` and enriched `devix minecraft list` / `--json` output.

- f216a72: Generate project meta files for every scaffold: Gradle wrapper scripts/properties, `.gitignore`, `.editorconfig`, `LICENSE`, `README.md` and a starter GitHub Actions workflow. The `.gitignore` is now generated centrally and covers Gradle, Maven and common IDE files.
- 0287f78: Add `devix minecraft run`, a print-first command that recommends how to launch a scaffolded project. It detects the platform, checks for the Gradle wrapper and suggests `./gradlew runClient`, `./gradlew runServer` or `./gradlew build` depending on the project kind.
- 48d5fae: Move the Minecraft version catalog from a hardcoded TypeScript array to `catalog/versions.json`. This allows updating dependency versions without recompiling the plugin. The JSON file is validated at build/test time and included in the published package.
- 209833e: Docker and Minecraft manifests now declare `capabilities.commands` with `apiVersion: "1"`. `devix plugin list` merges capability commands with the legacy top-level `commands` array.

### Patch Changes

- b0dfbc8: Rework the entire terminal interface.

  **New `@devix-cli/ui` package** with zero dependencies: capability detection (color level, Unicode support, clamped width), a restrained 256-color theme, and layout components (title, heading, fields, table, panel, list, hint).

  **Every console is supported.** Color follows `FORCE_COLOR`/`NO_COLOR`/`TERM`/`COLORTERM`/TTY. Unicode follows the locale on Unix and the emulator on Windows, where legacy consoles still mangle box drawing. Narrow terminals from 32 to 100 columns are handled: long values truncate, tables shrink their widest column but never below a column's longest token, so identifiers stay readable.

  **All commands migrated** to the new renderer: `status`, `doctor`, `detect`, `git status|branches|diff|sync`, `deps`, `docker`, `minecraft`, `web`, `config` and `plugin list`. Every command now shares the same flags: `--json`, `--cwd`, `--no-color`, `--quiet`, `--verbose`, `--config`.

  > **Breaking change:** human-readable output is now a designed layout instead of ad-hoc `Label: value` lines. Scripts parsing stdout should use `--json`.

- Updated dependencies [048d318]
- Updated dependencies [cf65db9]
- Updated dependencies [45f5cc9]
- Updated dependencies [6e9c4f7]
- Updated dependencies [493c8d9]
- Updated dependencies [46294ed]
  - @devix-cli/core@1.0.0
  - @devix-cli/output@1.0.0
  - @devix-cli/project-detector@1.0.0

## 0.3.1

### Patch Changes

- Fixes the internal dependency range: the plugin requires `@devix-cli/project-detector` 0.2.0 (the release that ships the Minecraft detectors), which the previous `^0.1.0` range excluded under strict 0.x semver.

## 0.3.0

### Minor Changes

- Adds the `@devix-cli/minecraft` plugin: scaffolds Minecraft mod and plugin skeletons for eight platforms — fabric, forge, architectury (multi-loader common+fabric+forge), spigot, paper, folia, velocity and bungeecord — via the new `devix minecraft list` and `devix minecraft init` commands. Scaffolding never overwrites existing files (fails with `EEXISTS` unless `overwrite` is set, and then only skips), supports `--dry-run`, `--package`, `--mc` and `--json`, and the plugin appears in `devix plugin list`.
