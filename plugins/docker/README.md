# @devix-cli/docker

> Docker integration for Devix with graceful degradation: a missing CLI or a stopped daemon is an availability report, never a thrown error.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. Built on [`@devix-cli/shell`](https://www.npmjs.com/package/@devix-cli/shell).

## Install

```bash
npm install @devix-cli/docker
```

## Example

```ts
import { dockerAvailability, images, runningContainers } from "@devix-cli/docker";

const availability = await dockerAvailability();
// { available: true, version: "27.5.1" }
// { available: false, reason: "cli-missing" }
// { available: false, reason: "daemon-down" }

if (availability.available) {
  const containers = await runningContainers();
  // [{ id, image, names, status }]

  const imgs = await images();
  // [{ repository, tag, size }]
} else {
  console.log(`Docker unavailable: ${availability.reason}`);
}
```

## The graceful degradation pattern

`dockerAvailability()` probes the daemon with `docker version --format` (10s timeout). Every failure maps to a reason: `"cli-missing"` when the executable is absent, `"daemon-down"` otherwise.

`runningContainers()` and `images()` return `undefined` instead of throwing when Docker is not usable, so callers can degrade cleanly:

```ts
const containers = await runningContainers();
if (containers === undefined) {
  // Docker is not usable here — show a friendly notice, skip the section, …
}
```

## API

| Export                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `dockerAvailability()` | Probe the CLI and the daemon                         |
| `runningContainers()`  | `docker ps` summaries, `undefined` when unusable     |
| `images()`             | `docker images` summaries, `undefined` when unusable |
| `DockerAvailability`   | `{ available, version?, reason? }`                   |
| `ContainerSummary`     | `{ id, image, names, status }`                       |
| `ImageSummary`         | `{ repository, tag, size }`                          |

## Guarantees

- **Never throws for absent Docker.** Absence is a state to diagnose, not an exception.
- **Bounded execution.** Every probe has a timeout; output is capped by `@devix-cli/shell` limits.
- **Read-only.** Inspection only — no container lifecycle operations.

## Part of Devix

- [Plugins guide](https://github.com/hauchdev/Devix/blob/main/docs/plugins.md)
- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
