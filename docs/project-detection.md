# Project detection

`@devix-cli/project-detector` identifies what a project is made of by reading marker files — no processes are executed, only filesystem reads through `@devix-cli/filesystem`.

## Core concepts

- **Detector** — a self-contained unit with a stable `id`, a display `name`, a `category` and declared `markers`. Adding one never requires touching the others: no central if/else.
- **Markers** — files or directories a detector looks for, used by `findProjectRoot` to delimit the project. The nearest marker walking upward wins.
- **Not found is not an error** — a detector reports `{ detected: false, detections: [] }`. Typed errors are reserved for API misuse.

## Built-in detectors

| Detector     | Category       | Markers                                                                                             | Details extracted                         |
| ------------ | -------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `node`       | language       | `package.json`                                                                                      | name, packageManager, engines, workspaces |
| `typescript` | language       | `tsconfig.json`                                                                                     | target, TypeScript version                |
| `java`       | language       | `pom.xml`, `build.gradle(.kts)`, `settings.gradle(.kts)`, `gradlew`                                 | artifactId, rootProject.name              |
| `rust`       | language       | `Cargo.toml`, `Cargo.lock`                                                                          | package name, edition                     |
| `python`     | language       | `pyproject.toml`, `requirements*.txt`, `setup.py`, `setup.cfg`, `Pipfile`, `poetry.lock`, `uv.lock` | project name                              |
| `npm`        | packageManager | `package-lock.json`                                                                                 | —                                         |
| `pnpm`       | packageManager | `pnpm-lock.yaml`, `pnpm-workspace.yaml`                                                             | lockfileVersion                           |
| `yarn`       | packageManager | `yarn.lock`, `.yarnrc.yml`                                                                          | lockfile version                          |
| `bun`        | packageManager | `bun.lockb`, `bun.lock`, `bunfig.toml`                                                              | —                                         |
| `git`        | tool           | `.git` (directory or file)                                                                          | entry kind                                |
| `docker`     | tool           | `Dockerfile*`, compose files, `.dockerignore`                                                       | —                                         |

### Minecraft platforms

Mod and proxy-plugin platforms use the dedicated `minecraft` category. `summarizeProject` groups them under `tools` while keeping `category: "minecraft"` on every entry, so renderers can split them out. All markers match flat or inside `src/main/resources`.

| Detector     | Markers                                             | Details extracted |
| ------------ | --------------------------------------------------- | ----------------- |
| `fabric`     | `fabric.mod.json`                                   | mod id            |
| `quilt`      | `quilt.mod.json`                                    | loader id         |
| `forge`      | `META-INF/mods.toml`, `META-INF/neoforge.mods.toml` | modId             |
| `neoforge`   | `META-INF/neoforge.mods.toml`                       | modId             |
| `bukkit`     | `plugin.yml`, `paper-plugin.yml`                    | plugin name       |
| `bungeecord` | `bungee.yml`, legacy `plugin.yml`                   | plugin name       |
| `velocity`   | `velocity-plugin.json`                              | plugin id         |
| `sponge`     | `sponge_plugin.json`, legacy `mcmod.info`           | plugin id         |

## Usage

```ts
import { createDefaultRegistry, summarizeProject } from "@devix-cli/project-detector";

const summary = await summarizeProject(createDefaultRegistry());
console.log(summary.languages, summary.packageManagers, summary.tools);
```

Lower-level APIs: `detectProject(registry, { cwd })` returns per-detector results, and `findProjectRoot(startDir, detectors)` resolves the root only.

### Minecraft-specific detection

`detectMinecraftPlatforms(registry, { cwd })` composes the results of every `minecraft`-category detector into a flat, ready-to-render answer:

```ts
import { createDefaultRegistry, detectMinecraftPlatforms } from "@devix-cli/project-detector";

const detection = await detectMinecraftPlatforms(createDefaultRegistry(), { cwd: process.cwd() });
if (detection.isMinecraft) {
  for (const platform of detection.platforms) {
    console.log(platform.id, platform.detail);
  }
}
```

- One entry per detector (registration order), so a hybrid Fabric + Velocity monorepo lists both.
- Entries carry the detector `id`/`name`, the first detection `detail` (mod or plugin id) and the full marker evidence.
- Not a Minecraft project is a normal result: `isMinecraft: false` with an empty `platforms`, never an error.
- Only real registered detectors count: the platform id of an entry always equals the detector id from the registry.

## Writing a detector

Implement the `Detector` interface and register it — existing detectors are never touched:

```ts
import type { Detector } from "@devix-cli/project-detector";

const myDetector: Detector = {
  id: "elixir",
  name: "Elixir",
  category: "language",
  markers: ["mix.exs"],
  async detect(context) {
    // Read the filesystem; return { detected: false, detections: [] } when absent.
  },
};
```

## Design rules

1. Markers are declared, never guessed.
2. A malformed manifest is not a detection failure: the marker still counts, without details.
3. Detection is parallel per directory for speed (Windows antivirus makes sequential probing slow).
4. No external parsing dependencies: JSON/JSONC and targeted TOML field reads only.
