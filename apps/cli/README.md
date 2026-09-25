# devix-cli

> The Devix CLI: understands your environment (Node, pnpm, Git, Docker…) and your project, so you don't have to memorize it.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. Read-only by design: inspection never mutates your repository or your dependencies.

## Install

```bash
npm install -g devix-cli
devix status
```

Requirements: Node.js 22 LTS or newer.

## Commands

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

## Flags

- `--json` — machine-readable output on most commands
- `--cwd <dir>` — inspect another directory
- `--version`, `--help` — available everywhere

Errors are one line and actionable; exit codes are `0` on success and `1` on failure.

## How it works

The CLI composes the small `@devix-cli/*` packages — [project detection](https://www.npmjs.com/package/@devix-cli/project-detector), [doctor](https://www.npmjs.com/package/@devix-cli/doctor), [git](https://www.npmjs.com/package/@devix-cli/git), [deps](https://www.npmjs.com/package/@devix-cli/deps), [docker](https://www.npmjs.com/package/@devix-cli/docker) — each of which you can also use directly in your own tools.

## Documentation

- [CLI reference](https://github.com/hauchdev/Devix/blob/main/docs/cli.md) — every command with examples
- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
