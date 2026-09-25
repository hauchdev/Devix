# @devix/project-detector

## 0.1.0

### Minor Changes

- First public release: the Devix CLI (`npm i -g devix-cli`) with `status`, `detect`, `doctor`, read-only `git` commands, dependency delegation through the detected package manager, Docker diagnostics with graceful degradation, and the `@devix/*` service packages powering them.

### Patch Changes

- b4cb6b8: Adds the `@devix/project-detector` package (PHASE 2): extensible detector architecture (`DetectorRegistry` + `Detector` interface, no central if/else), project root resolution with `findProjectRoot` (declared markers, nearest one wins) and a `detectProject(registry, { cwd })` API that aggregates results per detector. Includes the first detector (`node`: package.json with name, packageManager, engines and workspaces) and committed fixtures for tests.
- 3dff093: Adds a `category` field to every detector (language, packageManager, tool) and a new `summarizeProject` API that composes a project detection into grouped `languages`, `packageManagers` and `tools` lists, closing the phase 2 final API. `defaultDetectors` and the summary types are now exported from the package entry point.
- 74372b7: Exports every built-in detector from the package entry point and adds `createDefaultRegistry` (plus the `defaultDetectors` list), which bundles node, typescript, java, rust, python, npm, pnpm, yarn, bun, git and docker in a deterministic order.
- 74372b7: Adds the git and docker detectors. Git is detected via a `.git` directory or file (worktrees and submodules), with the entry kind as detail; Docker via Dockerfile variants, compose files (classic and Compose v2) and `.dockerignore`.
- 74372b7: Adds the java, rust and python detectors. Java via Maven (`pom.xml`) and Gradle (`build.gradle` variants, settings files, wrapper) with artifactId/rootProject.name details; Rust via `Cargo.toml`/`Cargo.lock` with package name and edition details; Python via `pyproject.toml`, `requirements*.txt`, `setup.py`/`setup.cfg`, `Pipfile`, `poetry.lock` and `uv.lock` with the `[project]` name as detail.
- 74372b7: Adds the npm and pnpm detectors. npm is detected via `package-lock.json`; pnpm via `pnpm-lock.yaml` and/or `pnpm-workspace.yaml`, with the lockfile version extracted as detection detail. Absence is never an error: detectors report `detected: false`.
- 18b5e8e: `findProjectRoot` now probes the markers of each directory in parallel instead of one by one. This makes detection of non-project directories (the no-marker worst case) several times faster, which matters most on Windows with real-time antivirus scanning.
- 74372b7: Adds the TypeScript detector via `tsconfig.json`, tolerating JSONC syntax (comments and trailing commas). Extracts `compilerOptions.target` and the typescript version declared in `package.json` as detection details.
- 74372b7: Adds the yarn and bun detectors. Yarn is detected via `yarn.lock` and/or `.yarnrc.yml`, with the lockfile version from the header comment as detail; Bun via `bun.lockb`, `bun.lock` and/or `bunfig.toml`.
- Updated dependencies
  - @devix/filesystem@0.1.0
