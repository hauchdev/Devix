# @devix-cli/minecraft

> Minecraft project scaffolding for Devix: generate mods, plugins and proxy plugins for Fabric, Forge, NeoForge, Architectury, Paper, Folia, Spigot, Velocity and BungeeCord — with multi-loader, multi-module and multi-version support.

Part of [Devix](https://github.com/hauchdev/Devix) - a modular developer toolkit. Ships as a Devix plugin: `devix minecraft list`, `devix minecraft init`, `devix minecraft check`, `devix minecraft doctor`, `devix minecraft build`, `devix minecraft clean` and `devix minecraft run`.

## Install

```bash
npm install -g devix-cli   # the plugin ships with the CLI
# or standalone:
npm install @devix-cli/minecraft
```

## Platforms

| Id             | Kind         | Build system | What you get                                              |
| -------------- | ------------ | ------------ | --------------------------------------------------------- |
| `fabric`       | mod          | Gradle       | Loom setup, `fabric.mod.json`, main entrypoint            |
| `forge`        | mod          | Gradle       | ForgeGradle, `mods.toml`, `@Mod` main class               |
| `neoforge`     | mod          | Gradle       | NeoGradle, `neoforge.mods.toml`, `@Mod` main class        |
| `architectury` | mod          | Gradle       | `common` + `fabric` + second-loader subprojects wired up  |
| `spigot`       | plugin       | Maven        | `spigot-api` pom, `plugin.yml`, `JavaPlugin` main class   |
| `paper`        | plugin       | Gradle       | `paper-api`, `paper-plugin.yml` with bootstrap + loader   |
| `folia`        | plugin       | Gradle       | `folia-api`, `plugin.yml` with `folia-supported: true`    |
| `velocity`     | proxy-plugin | Gradle       | `velocity-api`, `@Plugin` class with annotation processor |
| `bungeecord`   | proxy-plugin | Maven        | `bungeecord-api` pom, `bungee.yml`, `Plugin` main class   |

### Project kinds

The interactive flow (and the API) starts from the kind of project:

| Kind           | Platforms                             |
| -------------- | ------------------------------------- |
| `mod`          | fabric, forge, neoforge, architectury |
| `plugin`       | paper, folia, spigot                  |
| `proxy-plugin` | velocity, bungeecord                  |

## Multi-loader, multi-module, multi-version

**Multi-loader.** Combine Gradle mod loaders into one project: `fabric+forge`, `fabric+neoforge`, `forge+neoforge` or the triple. You get one Gradle build with a shared version catalog, a `common` source set and one subproject per loader, each with its manifest (`fabric.mod.json`, `mods.toml`, `neoforge.mods.toml`) and entrypoint delegating to the shared code.

**Multi-module.** Add optional extra modules to any project: `api` (public API subproject), `core` (implementation split), and — for mod loaders — `game-tests` and `datagen`. Any module turns the project into a Gradle multi-project (or a Maven reactor for Spigot/BungeeCord): the entrypoint stays at the root, extras get their own subproject wired through `settings.gradle` / parent pom.

**Multi-version.** Every dependency line comes from a version catalog keyed by Minecraft version, so the same command targets `26.3` (year-drop numbering), `1.21.1` or `1.20.1` with `--mc`. Versions resolve from ids (`26.3`), aliases (`stable`, `legacy`) or drop names (`wilderness`). When a platform has no line for a version (NeoForge on 1.20.1, Forge on 26.x) the scaffold fails with `EUNSUPPORTED_VERSION` instead of generating a broken build. Architectury picks its second loader from the version: Forge on legacy lines, NeoForge on modern ones.

## CLI usage

```bash
# See every kind, platform and module
devix minecraft list

# Interactive (TTY): kind -> platform(s) -> modules -> name -> version -> mc -> package
devix minecraft init

# Preview without writing anything
devix minecraft init fabric "Cool Sword" --dry-run

# Create a mod in the current directory
devix minecraft init fabric "Cool Sword" --package com.example.coolsword

# Multi-loader: one project, two loaders, shared version catalog
devix minecraft init fabric+forge "DualSword" --mc 1.21.1

# Multi-module: entrypoint + api + core subprojects
devix minecraft init paper "QueueBoard" --modules api,core

# By kind: the default platform of the kind is used
devix minecraft init --kind proxy-plugin "Relay"

# Target a specific Minecraft version (id, alias or drop name)
devix minecraft init neoforge "ModernMod" --mc 26.3
devix minecraft init forge "ClassicMod" --mc 1.20.1

# Create a Paper plugin in a specific directory
devix minecraft init paper "QueueBoard" --cwd ./projects/queueboard

# JSON output for tooling
devix minecraft init spigot "EggCannon" --json

# Detect an existing Minecraft project (any supported platform)
devix minecraft check
devix minecraft check fabric

# Diagnose an existing project: wrapper, Java, version catalog
devix minecraft doctor

# Print how to build, clean or launch it (print-first)
devix minecraft build
devix minecraft clean
devix minecraft run
```

`check` walks up from the directory and reports every detected platform with its manifest detail (`fabric (mymod)`), or `isMinecraft: false` outside Minecraft projects. With a platform id it also reports whether that specific one matched. It reads the same markers as `@devix-cli/project-detector`'s `detectMinecraftPlatforms`.

`doctor` is the diagnosis for a project that already exists: whether a platform was detected, whether the build wrapper and its jar are present, whether the Java toolchain meets what the target version needs, and whether the declared Minecraft version is one the catalog knows. Every check degrades to `warn` or `missing` with a hint rather than throwing.

`build`, `clean` and `run` print the command instead of executing it. Building always uses the `build` task and cleaning the `clean` task; only `run` launches the game.

Run `devix minecraft` with no operation on a TTY to pick one from a menu.

Flags: `--kind` (project kind), `--modules` (extra modules), `--cwd` (target directory), `--package` (Java package), `--version`, `--mc` (Minecraft version or alias), `--dry-run`, `--overwrite`, `--json`.

## API

```ts
import { MINECRAFT_PLATFORMS, scaffold, summarizeScaffold } from "@devix-cli/minecraft";

const result = await scaffold({
  root: "/absolute/path/to/MyMod",
  platform: "fabric+forge", // or kind: "mod"
  name: "Cool Sword",
  packageName: "com.example.coolsword", // optional, default com.example.<slug>
  minecraftVersion: "26.3", // or "stable", "1.21.1", "wilderness"…
  modules: ["api", "core"], // optional extras -> multi-module
  dryRun: false,
});

for (const line of summarizeScaffold(result)) console.log(line);
```

| Export                                            | Description                                                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `scaffold(options)`                               | Generate a project skeleton (single, multi-loader, multi-module)                                                              |
| `summarizeScaffold(result)`                       | Human-readable summary lines                                                                                                  |
| `MINECRAFT_PROJECT_KINDS`                         | The kind catalog (`mod`, `plugin`, `proxy-plugin`)                                                                            |
| `MINECRAFT_PLATFORMS`, `PLATFORM_IDS`             | The platform catalog (with `buildSystem`, `loaders`, `combinable`)                                                            |
| `MINECRAFT_MODULES`, `MODULE_IDS`                 | The optional module catalog                                                                                                   |
| `MINECRAFT_VERSIONS`, `DEFAULT_MINECRAFT_VERSION` | The version catalog and its default (`resolveVersionSpec`, `resolveLoaderVersions`, `supportedLoaders`)                       |
| `MinecraftError`                                  | Typed error (`EUNKNOWN_PLATFORM`, `EUNKNOWN_VERSION`, `EUNSUPPORTED_VERSION`, `EUNKNOWN_MODULE`, `EINVALID_INPUT`, `EEXISTS`) |
| `PLUGIN_VERSION`, `MINECRAFT_PLUGIN_MANIFEST`     | Plugin identity for the core registry                                                                                         |

The scaffold result includes `platforms`, `kind`, `minecraftVersion`, `javaVersion`, `modules` and `targetPlatforms`: the Minecraft platforms the destination had before writing (empty on fresh directories), so callers can tell fresh scaffolds from additions to an existing project.

## Safety guarantees

- **Existing files are never overwritten.** Without `overwrite`, scaffolding into a directory that already contains template files fails with `EEXISTS`; with `overwrite`, existing files are skipped and reported, generated ones are added.
- **Existing Minecraft projects are respected.** When the destination already looks like a Minecraft project (any platform detector matched), `scaffold` fails with `EINVALID_INPUT` unless you pass `allowExistingProject: true`. Dry-runs always proceed and note the detection instead.
- **`dryRun: true` writes nothing.** The result lists exactly what would be created.
- **Deterministic output.** The same options always produce the same files.
- **No process execution.** Scaffolding is pure filesystem writing; building your mod stays in your build system.

## Part of Devix

- [Plugins guide](https://github.com/hauchdev/Devix/blob/main/docs/plugins.md)
- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
