# Devix

> A modular developer toolkit: a CLI that understands your environment (Node, pnpm, Git, Docker…) and your project, so you don't have to memorize it.

**Status:** under active development — PHASE 1 (Core Architecture) complete, PHASE 2 (Project Detector) nearly complete: all built-in detectors are implemented and tested. Package APIs are experimental and may change until 1.0.

## What is it

Devix is a monorepo of small, focused packages. Each one solves a concrete problem and composes with the rest:

| Package                                      | What it does                                               | Status     |
| -------------------------------------------- | ---------------------------------------------------------- | ---------- |
| [`@devix/core`](./packages/core)             | Shared foundations (constants, base types)                 | ✅         |
| [`@devix/logger`](./packages/logger)         | Centralized logging                                        | ✅         |
| [`@devix/filesystem`](./packages/filesystem) | Cross-platform filesystem abstractions                     | ✅         |
| [`@devix/shell`](./packages/shell)           | Safe, controlled external process execution                | ✅         |
| [`@devix/config`](./packages/config)         | Configuration loading (`devix.config.json` / `devix.json`) | ✅         |
| `@devix/project-detector`                    | Automatic project stack detection                          | 🔵 PHASE 2 |
| `@devix/git`                                 | Safe Git operations                                        | 🔜         |
| `apps/cli`                                   | The `devix` CLI (`doctor`, `git`, `deps`…)                 | 🔜         |

## Getting started (development)

Requirements: **Node.js 22 LTS**, **pnpm 12.5.1** (pinned via Corepack) and **Git**.

```bash
corepack enable
corepack prepare pnpm@12.5.1 --activate

git clone https://github.com/hauchdev/Devix.git
cd Devix
pnpm install
```

## Usage

No publishable CLI yet. In the future:

```bash
devix doctor    # environment and project diagnostics
devix git sync  # safe Git operations
devix deps      # dependencies with the detected package manager
```

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

### Writing your config

Create a `devix.config.json` (or `devix.json`) at your project root:

```json
{
  "name": "my-project",
  "features": {
    "doctor": true,
    "git": true,
    "deps": false
  }
}
```

The search walks up parent directories (nearest file wins). No file means no error: configuration is optional by design.

### Detecting a project's stack

`@devix/project-detector` identifies Node.js, TypeScript, Java, Rust, Python, npm, pnpm, Yarn, Bun, Git and Docker projects from their marker files:

```ts
import { createDefaultRegistry, summarizeProject } from "@devix/project-detector";

const summary = await summarizeProject(createDefaultRegistry());

console.log(summary.root, summary.isProject);
for (const language of summary.languages) {
  console.log(language.id, language.detection?.detail);
}
for (const pm of summary.packageManagers) {
  console.log(pm.id);
}
for (const tool of summary.tools) {
  console.log(tool.id);
}
```

Detectors are independent units with stable ids, declared markers and a coarse `category` (language, packageManager, tool): adding one never requires touching the others, and "not found" is never an error (`detected: false`).

## Architecture in 10 seconds

```text
apps/cli  →  plugins  →  services  →  packages  →  core
```

Dependencies only flow downward, always via `workspace:*`. Every package is ESM, strict TypeScript, cross-platform (Windows included) and ships its own typed errors (`FilesystemError`, `ShellError`, `ConfigError`).

## CI

GitHub Actions on every push and PR: **format → lint → typecheck → test → build**, on an **ubuntu + windows** matrix (Node 22 and 24). Windows is always verified: it is a target platform for Devix.

## Security

Found a vulnerability? Please do not open a public issue. Follow [SECURITY.md](./SECURITY.md).

## Contributing

Contributions are welcome! Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [code of conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © hauchdev
