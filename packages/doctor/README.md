# @devix-cli/doctor

> Environment and project diagnostics as a pure service: tool version checks plus a project stack summary, ready to render however you want.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. Combines [`@devix-cli/project-detector`](https://www.npmjs.com/package/@devix-cli/project-detector) with tool probing over [`@devix-cli/shell`](https://www.npmjs.com/package/@devix-cli/shell).

## Install

```bash
npm install @devix-cli/doctor
```

## Example

```ts
import { runDoctor, checkEnvironment, checkProject } from "@devix-cli/doctor";

const report = await runDoctor({ cwd: process.cwd() });

for (const check of report.environment.checks) {
  console.log(`${check.status === "ok" ? "✓" : "✗"} ${check.name} ${check.detail ?? ""}`);
}
// ✓ Node.js v22.23.2
// ✓ Git git version 2.51.0
// ✗ Docker (missing)

report.project;
// {
//   root: "/work/my-project",
//   isProject: true,
//   languages: ["node", "typescript"],
//   packageManagers: ["pnpm"],
//   tools: ["git", "docker"],
// }
```

## Report shape

`runDoctor` resolves to a `DoctorReport`:

- `environment.checks[]` — `{ id, name, status, detail? }` with `status` being `"ok" | "missing" | "warn"`
- `project` — `{ root, isProject, languages, packageManagers, tools }`

The service is pure: no printing, no process exit codes. Rendering is the caller's job (that is what the `devix doctor` CLI command does).

## Injectable for tests

```ts
import { runDoctor } from "@devix-cli/doctor";

const report = await runDoctor({
  services: {
    async getToolVersion(tool) {
      return tool === "node" ? "v99.0.0-fake" : undefined;
    },
  },
});
```

## API

| Export                         | Description                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `runDoctor(options?)`          | Full diagnosis (`cwd`, `registry`, `services` injectable)                       |
| `checkEnvironment(services)`   | Environment checks only                                                         |
| `checkProject(registry, cwd?)` | Project inspection only                                                         |
| `defaultServices`              | Real tool probing over `@devix-cli/shell`                                       |
| Types                          | `DoctorReport`, `CheckResult`, `CheckStatus`, `DoctorServices`, `ProjectReport` |

## Guarantees

- **Pure service.** No console output, no side effects beyond read-only probes.
- **Missing tools are results, not exceptions.** Every check degrades to a status.
- **Injectable everything.** Swap tool resolution or the detector registry for tests.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
