# @devix-cli/project-detector

> Automatic project stack detection for Devix: identify languages, package managers and tools by reading marker files. No processes are executed — only filesystem reads.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit.

## Install

```bash
npm install @devix-cli/project-detector
```

## Example

```ts
import {
  createDefaultRegistry,
  findProjectRoot,
  summarizeProject,
} from "@devix-cli/project-detector";

const registry = createDefaultRegistry();

// Locate the project root from any subdirectory
const root = await findProjectRoot(registry, process.cwd());

// Full detection grouped by category
const summary = await summarizeProject(registry, { cwd: process.cwd() });

summary.isProject; // true when any marker was found
summary.languages.map((e) => e.id); // e.g. ["node", "typescript"]
summary.packageManagers.map((e) => e.id); // e.g. ["pnpm"]
summary.tools.map((e) => e.id); // e.g. ["git", "docker"]

// Raw per-detector results
import { detectProject } from "@devix-cli/project-detector";
const detection = await detectProject(registry, { cwd: process.cwd() });
detection.detectors.get("pnpm"); // { detected: true, detections: [...] }
```

## Default detectors

| Category         | Ids                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------ | --- | ------ | --------------- |
| `language`       | `node`, `typescript`, `java`, `rust`, `python`                                       |
| `packageManager` | `npm`, `pnpm`, `yarn`, `bun`                                                         |     | `tool` | `git`, `docker` |
| `minecraft`      | `fabric`, `quilt`, `forge`, `neoforge`, `bukkit`, `bungeecord`, `velocity`, `sponge` |

Minecraft mod/plugin platforms (Fabric, Quilt, Forge, NeoForge, Bukkit/Spigot/Paper, BungeeCord, Velocity, Sponge) use the dedicated `minecraft` category. `summarizeProject` groups them under `tools` while keeping `category: "minecraft"` on every entry, so renderers can split them out.

## Write your own detector

A detector is a self-contained unit with a stable id. Adding one never requires touching the existing ones — implement `Detector` and register it:

```ts
import type { Detector } from "@devix-cli/project-detector";
import { DetectorRegistry } from "@devix-cli/project-detector";
import { isFile, readFileString } from "@devix-cli/filesystem";

const goDetector: Detector = {
  id: "go",
  name: "Go",
  category: "language",
  markers: ["go.mod"],
  async detect({ root }) {
    const marker = `${root}/go.mod`;
    if (!(await isFile(marker))) return { detected: false, detections: [] };
    const content = await readFileString(marker);
    const module = /^module\s+(\S+)/m.exec(content)?.[1];
    return {
      detected: true,
      detections: [{ marker: "go.mod", path: marker, detail: module }],
    };
  },
};

const registry = new DetectorRegistry().register(goDetector);
```

Rules of the architecture: detectors never throw for "not found" (they return an empty result), only read the filesystem, and never execute processes.

## API

| Export | Description |
| --------------------------------------------- | --------------------------------------------------------------------------------- || `createDefaultRegistry()`, `defaultDetectors` | The built-in detector set (19 detectors) |
| `detectProject(registry, options?)` | Run every detector on the detected project root |
| `summarizeProject(registry, options?)` | Category-grouped view (`languages`, `packageManagers`, `tools`) |
| `findProjectRoot(registry, startDir?)` | Nearest ancestor directory with any known marker |
| `DetectorRegistry` | Registration container (rejects duplicate ids) |
| `ProjectDetectorError` | Typed error (`EINVALID`, `EUNKNOWN_DETECTOR`) |
| Types | `Detector`, `Detection`, `DetectionResult`, `ProjectDetection`, `ProjectSummary`… |

Full guide: [docs/project-detection.md](https://github.com/hauchdev/Devix/blob/main/docs/project-detection.md).

## Guarantees

- **Read-only.** Marker files are read; nothing is executed, nothing is written.
- **Minecraft-aware.** Fabric, Quilt, Forge, NeoForge, Bukkit/Spigot/Paper, BungeeCord, Velocity and Sponge mod/plugin projects are detected from their manifests (`fabric.mod.json`, `plugin.yml`, `velocity-plugin.json`, …), flat or under `src/main/resources`.
- **"Not found" is never an error.** An empty directory yields an honest empty summary.
- **Extensible without forks.** Register detectors; no core edits needed.

## Part of Devix

- [Project detection guide](https://github.com/hauchdev/Devix/blob/main/docs/project-detection.md)
- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
