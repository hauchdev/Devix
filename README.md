# Devix

> A modular developer toolkit: a CLI that understands your environment (Node, pnpm, Git, Docker…) and your project, so you don't have to memorize it.

**Status:** v1.0 candidate — the core platform (project detection, doctor, git, deps, docker, plugins) is implemented and tested. Package APIs may still change until the 1.0.0 release.

## Quick start

Requirements: **Node.js 22 LTS**, **pnpm 12.5.1** (pinned via Corepack) and **Git**.

```bash
corepack enable
corepack prepare pnpm@12.5.1 --activate

git clone https://github.com/hauchdev/Devix.git
cd Devix
pnpm install
pnpm build
```

### Install the `devix` command

From the repository, link the CLI globally so `devix` works in cmd, PowerShell and POSIX shells:

```bash
cd apps/cli
pnpm add -g .
```

Or run it without installing:

```bash
node apps/cli/bin/run.js --help
```

> The global command is a link to the repository: run `pnpm build` after pulling changes. To remove it: `pnpm remove -g @devix/cli`.

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
devix plugin list
```

Most commands accept `--json` for machine-readable output and `--cwd` to inspect another directory. Errors are one line and actionable; exit codes are `0` on success and `1` on failure.

## Packages

| Package                                                  | What it does                                               | Docs                                             |
| -------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| [`@devix/core`](./packages/core)                         | Foundations: version, plugin API                           |                                                  |
| [`@devix/filesystem`](./packages/filesystem)             | Cross-platform filesystem abstractions                     |                                                  |
| [`@devix/shell`](./packages/shell)                       | Safe, controlled external process execution                |                                                  |
| [`@devix/config`](./packages/config)                     | Configuration loading (`devix.config.json` / `devix.json`) |                                                  |
| [`@devix/logger`](./packages/logger)                     | Centralized logging                                        |                                                  |
| [`@devix/project-detector`](./packages/project-detector) | Automatic project stack detection                          | [project-detection](./docs/project-detection.md) |
| [`@devix/git`](./packages/git)                           | Safe, read-first Git operations                            |                                                  |
| [`@devix/doctor`](./packages/doctor)                     | Environment and project diagnostics service                |                                                  |
| [`@devix/deps`](./packages/deps)                         | Package manager detection and delegation                   |                                                  |
| [`@devix/docker`](./plugins/docker)                      | Docker integration with graceful degradation               |                                                  |
| [`apps/cli`](./apps/cli)                                 | The `devix` CLI                                            | [cli](./docs/cli.md)                             |

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
pnpm --filter @devix/config test
```

## Architecture in 10 seconds

```text
apps/cli  →  plugins  →  services  →  packages  →  core
```

Dependencies only flow downward, always via `workspace:*`. Every package is ESM, strict TypeScript, cross-platform (Windows included) and ships its own typed errors (`FilesystemError`, `ShellError`, `ConfigError`, `GitError`, …). Details in [docs/architecture.md](./docs/architecture.md).

## CI

GitHub Actions on every push and PR: **format → lint → typecheck → test → build**, on an **ubuntu + windows** matrix (Node 22 and 24). Windows is always verified: it is a target platform for Devix.

## Security

Found a vulnerability? Please do not open a public issue. Follow [SECURITY.md](./SECURITY.md).

## Contributing

Contributions are welcome! Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [code of conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © hauchdev
