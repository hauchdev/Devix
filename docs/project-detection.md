# Project detection

`@devix/project-detector` identifies what a project is made of by reading marker files — no processes are executed, only filesystem reads through `@devix/filesystem`.

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

## Usage

```ts
import { createDefaultRegistry, summarizeProject } from "@devix/project-detector";

const summary = await summarizeProject(createDefaultRegistry());
console.log(summary.languages, summary.packageManagers, summary.tools);
```

Lower-level APIs: `detectProject(registry, { cwd })` returns per-detector results, and `findProjectRoot(startDir, detectors)` resolves the root only.

## Writing a detector

Implement the `Detector` interface and register it — existing detectors are never touched:

```ts
import type { Detector } from "@devix/project-detector";

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
