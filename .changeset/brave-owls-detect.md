---
"@devix/project-detector": patch
---

Adds the `@devix/project-detector` package (PHASE 2): extensible detector architecture (`DetectorRegistry` + `Detector` interface, no central if/else), project root resolution with `findProjectRoot` (declared markers, nearest one wins) and a `detectProject(registry, { cwd })` API that aggregates results per detector. Includes the first detector (`node`: package.json with name, packageManager, engines and workspaces) and committed fixtures for tests.
