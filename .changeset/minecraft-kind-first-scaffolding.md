---
"@devix-cli/minecraft": minor
"devix-cli": minor
---

Rewrites `devix minecraft init` as a kind-first, fully scriptable scaffolding flow with multi-loader, multi-module and multi-version support.

**Interactive flow (TTY).** `devix minecraft init` now asks, in order: the project kind (mod / plugin / proxy-plugin), the target platform(s) as a multi-select, the optional extra modules, then the project name, project version, Minecraft version and Java package. Every question is skippable by passing the value as an argument or flag, so scripts keep working without prompts.

**Multi-loader.** Gradle mod loaders combine into one project via `fabric+forge`, `fabric+neoforge` or the triple: one shared version catalog in `gradle.properties`, a `common` source set, and one subproject per loader with its own manifest (`fabric.mod.json`, `mods.toml`, `neoforge.mods.toml`) and entrypoint delegating to the shared code. Maven platforms stay single-loader and are rejected in combinations.

**Multi-module.** New `--modules api,core,game-tests,datagen` flag (and API option) adds extra subprojects: `api` (public API), `core` (implementation split), plus `game-tests` and `datagen` for mod loaders. Any module turns the project into a Gradle multi-project or a Maven reactor; the entrypoint stays at the root and extras are wired through `settings.gradle` / parent pom.

**Multi-version.** New `--mc` version catalog: dependency lines are keyed by Minecraft version (`26.3`, `26.1`, `1.21.11`, `1.21.1`, `1.20.1`) with aliases (`stable`, `legacy`) and drop names (`wilderness`); every generated build resolves its dependencies from `gradle.properties`, never hardcoded. Unsupported combinations fail with `EUNSUPPORTED_VERSION`, and unknown versions with `EUNKNOWN_VERSION`. Architectury now picks its second loader from the version — NeoForge on modern lines, Forge on legacy ones.

**New platform.** Adds `neoforge` scaffolding (NeoGradle userdev, `neoforge.mods.toml`, `@Mod` main class), bringing the catalog to nine platforms grouped by the new kind taxonomy (`mod`, `plugin`, `proxy-plugin`) exposed through `MINECRAFT_PROJECT_KINDS`, `MINECRAFT_MODULES`, `MINECRAFT_VERSIONS` and enriched `devix minecraft list` / `--json` output.
