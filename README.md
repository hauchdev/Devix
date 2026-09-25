# Devix

> A modular developer toolkit: a CLI that understands your environment (Node, pnpm, Git, Docker…) and your project, so you don't have to memorize it.

[![npm](https://img.shields.io/npm/v/devix-cli)](https://www.npmjs.com/package/devix-cli)
[![CI](https://github.com/hauchdev/Devix/actions/workflows/ci.yml/badge.svg)](https://github.com/hauchdev/Devix/actions/workflows/ci.yml)
[![Node](https://img.shields.io/node/v/devix-cli)](https://www.npmjs.com/package/devix-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Status:** v0.1.0 is published on npm. The core platform (project detection, doctor, git, deps, docker, plugins) is implemented and tested; package APIs may still evolve toward 1.0 — see the [roadmap](./ROADMAP.md).

## Quick start

```bash
npm install -g devix-cli
```

Then run `devix` anywhere:

```bash
devix status            # everything at a glance, read-only
```

Requirements: **Node.js 22 LTS** or newer.

### Run from the repository (contributors)

```bash
corepack enable
corepack prepare pnpm@12.5.1 --activate

git clone https://github.com/hauchdev/Devix.git
cd Devix
pnpm install
pnpm build

# link the global command to your working copy
cd apps/cli && pnpm add -g .
```

> The global command is a link to the repository: run `pnpm build` after pulling changes. To remove it: `pnpm remove -g devix-cli`.

## What can it do?

```bash
# Everything at a glance
devix status            # project + environment + git + docker, read-only

# What is this project made of?
devix detect            # languages, package managers, tools

# Is my environment healthy?
devix doctor            # tool versions + project summary, ✓/✗ style

# Read-only Git insight (never mutates your repo)
devix git status        # branch + changed paths
devix git branches      # local branches, current one marked
devix git diff          # per-file line counts vs HEAD
devix git sync          # ahead/behind + the commands to run yourself

# Dependencies through the project's own package manager
devix deps list         # also: outdated, audit

# Docker, degrading gracefully when it is not installed
devix docker status     # also: ps, images

# What is installed?
devix plugin list       # docker, minecraft
```

### Scaffold a Minecraft project

```bash
devix minecraft list                          # fabric, forge, architectury, spigot, paper, folia, velocity, bungeecord
devix minecraft init fabric "Cool Sword" --dry-run
devix minecraft init paper "QueueBoard" --cwd ./projects/queueboard
```

Most commands accept `--json` for machine-readable output and `--cwd` to inspect another directory. Errors are one line and actionable; exit codes are `0` on success and `1` on failure. Every command is in [docs/cli.md](./docs/cli.md).

## Packages

Everything the CLI uses is a small, standalone npm package you can reuse in your own tools.

| Package                                                      | What it does                                                                                          | Docs                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --- | --------------------------------------- | -------------------------------------------- | --- |
| [`@devix-cli/core`](./packages/core)                         | Foundations: version constant, plugin API                                                             |                                                  |
| [`@devix-cli/filesystem`](./packages/filesystem)             | Cross-platform filesystem abstractions                                                                |                                                  |
| [`@devix-cli/shell`](./packages/shell)                       | Safe, controlled external process execution                                                           |                                                  |
| [`@devix-cli/config`](./packages/config)                     | Configuration loading (`devix.config.json` / `devix.json`)                                            |                                                  |
| [`@devix-cli/logger`](./packages/logger)                     | Centralized logging                                                                                   |                                                  |
| [`@devix-cli/project-detector`](./packages/project-detector) | Automatic project stack detection                                                                     | [project-detection](./docs/project-detection.md) |
| [`@devix-cli/git`](./packages/git)                           | Safe, read-first Git operations                                                                       |                                                  |
| [`@devix-cli/doctor`](./packages/doctor)                     | Environment and project diagnostics service                                                           |                                                  |
| [`@devix-cli/deps`](./packages/deps)                         | Package manager detection and delegation                                                              |                                                  |     | [`@devix-cli/docker`](./plugins/docker) | Docker integration with graceful degradation |     |
| [`@devix-cli/minecraft`](./plugins/minecraft)                | Scaffolds Minecraft projects: fabric, forge, architectury, spigot, paper, folia, velocity, bungeecord |                                                  |
| [`devix-cli`](./apps/cli)                                    | The `devix` CLI                                                                                       | [cli](./docs/cli.md)                             |

## Why Devix

- **Read-only by design.** Inspection never mutates your repository or your dependencies; mutating actions are printed for you to run, not executed.
- **Safe process execution.** Commands run as argv arrays — never `shell: true` with external input — with output limits, timeouts and abort support built in.
- **Windows is a first-class platform.** Every package and the CI matrix (ubuntu + windows, Node 22/24) treat Windows as a target, not an afterthought.
- **Typed errors everywhere.** `FilesystemError`, `ShellError`, `ConfigError`, `GitError`, `DepsError`… with machine-readable codes; no raw `node:fs` errors leak out.
- **Graceful degradation.** A missing Docker daemon or a non-project directory is a normal, reportable state — not a stack trace.

## Documentation

- [Architecture](./docs/architecture.md) — layers, dependency rules, cross-cutting guarantees
- [CLI](./docs/cli.md) — every command with examples
- [Project detection](./docs/project-detection.md) — the detector catalog and how to write one
- [Plugins](./docs/plugins.md) — the manifest, the registry, the security model

## Development

```bash
pnpm build      # build all packages (Turborepo)
pnpm test       # Vitest
pnpm lint       # ESLint 9
pnpm typecheck  # strict TypeScript, no emit
pnpm format     # Prettier
```

Work on a single package:

```bash
pnpm --filter @devix-cli/config test
```

Releases are managed with [Changesets](https://github.com/changesets/changesets): push to `main` and the [release workflow](./.github/workflows/release.yml) versions and publishes every changed package to npm automatically.

## Architecture in 10 seconds

```text
apps/cli  →  plugins  →  services  →  packages  →  core
```

Dependencies only flow downward, always via `workspace:*`. Every package is ESM, strict TypeScript, cross-platform (Windows included) and ships its own typed errors (`FilesystemError`, `ShellError`, `ConfigError`, `GitError`, …). Details in [docs/architecture.md](./docs/architecture.md).

## Security

Found a vulnerability? Please do not open a public issue. Follow [SECURITY.md](./SECURITY.md).

## Contributing

Contributions are welcome! Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [code of conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © hauchdev
