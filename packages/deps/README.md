# @devix-cli/deps

> Package manager detection and read-only dependency delegation for Devix: speak to npm, pnpm, yarn or bun through one API, using the project's own manager.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. Built on [`@devix-cli/project-detector`](https://www.npmjs.com/package/@devix-cli/project-detector) and [`@devix-cli/shell`](https://www.npmjs.com/package/@devix-cli/shell).

## Install

```bash
npm install @devix-cli/deps
```

## Example

```ts
import { detectPackageManager, lockfileFor, runDepsCommand, DepsError } from "@devix-cli/deps";

const manager = await detectPackageManager(process.cwd()); // "pnpm" | "yarn" | "bun" | "npm"
lockfileFor(manager); // "pnpm-lock.yaml"

// Delegate a read-only command to the detected manager
const { manager: used, output } = await runDepsCommand(process.cwd(), "list");
console.log(`via ${used}:\n${output.stdout}`);

try {
  await runDepsCommand("/empty/dir", "list");
} catch (error) {
  if (error instanceof DepsError && error.code === "EPM_UNDETECTED") {
    console.error("no package manager markers in this directory");
  }
}
```

## Supported commands

Each command maps to the manager's native arguments; parsing stays with the manager itself.

| Command    | npm            | pnpm             | yarn             | bun        |
| ---------- | -------------- | ---------------- | ---------------- | ---------- |
| `list`     | `ls --depth=0` | `list --depth=0` | `list --depth=0` | `pm ls`    |
| `outdated` | `outdated`     | `outdated`       | `outdated`       | `outdated` |
| `audit`    | `audit`        | `audit`          | `audit`          | `audit`    |

Detection precedence: manager lockfiles win over bare manifests (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, `package-lock.json` → npm); a Node.js project with no lockfile at all defaults to npm.

## API

| Export                                        | Description                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `detectPackageManager(directory, registry?)`  | The project's package manager                                                  |
| `lockfileFor(manager)`                        | The lockfile name identifying a manager                                        |
| `runDepsCommand(directory, command, runner?)` | Run `list` / `outdated` / `audit` via the manager                              |
| `defaultDepsRunner`, `DepsRunner`             | Injectable execution layer (bounded, argv-only)                                |
| `DepsError`                                   | Typed error (`EPM_NOT_FOUND`, `EPM_UNDETECTED`, `ECOMMAND_FAILED`, `EINVALID`) |

Note: the manager's exit code is returned as-is — `npm outdated` exits 1 when there are outdated packages, which is a result, not a failure.

## Guarantees

- **Read-only commands only.** No install, no remove, no publish — delegation never mutates your dependencies.
- **Bounded execution.** 120s timeout, argv arrays, no shell concat.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
