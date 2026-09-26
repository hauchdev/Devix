# @devix-cli/minecraft

> Minecraft platform scaffolding for Devix: generate mod and plugin skeletons for Fabric, Forge, Architectury, Spigot, Paper, Folia, Velocity and BungeeCord.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. Ships as a Devix plugin: `devix minecraft list` and `devix minecraft init`.

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
| `architectury` | mod          | Gradle       | `common` + `fabric` + `forge` multi-project wired up      |
| `spigot`       | plugin       | Maven        | `spigot-api` pom, `plugin.yml`, `JavaPlugin` main class   |
| `paper`        | plugin       | Gradle       | `paper-api`, `paper-plugin.yml` with bootstrap + loader   |
| `folia`        | plugin       | Gradle       | `folia-api`, `plugin.yml` with `folia-supported: true`    |
| `velocity`     | proxy-plugin | Gradle       | `velocity-api`, `@Plugin` class with annotation processor |
| `bungeecord`   | proxy-plugin | Maven        | `bungeecord-api` pom, `bungee.yml`, `Plugin` main class   |

## CLI usage

```bash
# See every platform
devix minecraft list

# Preview without writing anything
devix minecraft init fabric "Cool Sword" --dry-run

# Create a mod in the current directory
devix minecraft init fabric "Cool Sword" --package com.example.coolsword

# Create a Paper plugin in a specific directory
devix minecraft init paper "QueueBoard" --cwd ./projects/queueboard

# JSON output for tooling
devix minecraft init spigot "EggCannon" --json

# Detect an existing Minecraft project (any of the 8 platforms)
devix minecraft check
devix minecraft check fabric

# Interactive: pick the platform from a list, then type a name (TTY only)
devix minecraft init
```

`check` walks up from the directory and reports every detected platform with its manifest detail (`fabric (mymod)`), or `isMinecraft: false` outside Minecraft projects. With a platform id it also reports whether that specific platform matched. It reads the same markers as `@devix-cli/project-detector`'s `detectMinecraftPlatforms`.

Flags: `--cwd` (target directory), `--package` (Java package), `--version`, `--mc` (Minecraft version), `--dry-run`, `--overwrite`, `--json`.

## API

```ts
import { MINECRAFT_PLATFORMS, scaffold, summarizeScaffold } from "@devix-cli/minecraft";

const result = await scaffold({
  root: "/absolute/path/to/MyMod",
  platform: "fabric",
  name: "Cool Sword",
  packageName: "com.example.coolsword", // optional, default com.example.<slug>
  dryRun: false,
});

for (const line of summarizeScaffold(result)) console.log(line);
```

| Export                                        | Description                                                    |
| --------------------------------------------- | -------------------------------------------------------------- |
| `scaffold(options)`                           | Generate a platform skeleton                                   |
| `summarizeScaffold(result)`                   | Human-readable summary lines                                   |
| `MINECRAFT_PLATFORMS`, `PLATFORM_IDS`         | The platform catalog                                           |
| `MinecraftError`                              | Typed error (`EUNKNOWN_PLATFORM`, `EINVALID_INPUT`, `EEXISTS`) |
| `PLUGIN_VERSION`, `MINECRAFT_PLUGIN_MANIFEST` | Plugin identity for the core registry                          |

The scaffold result includes `targetPlatforms`: the Minecraft platforms the destination had before writing (empty on fresh directories), so callers can tell fresh scaffolds from additions to an existing project.

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
