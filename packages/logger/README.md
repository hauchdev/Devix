# @devix-cli/logger

> Centralized logging for Devix: one tiny, dependency-free logging entry point.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit.

## Install

```bash
npm install @devix-cli/logger
```

## Example

```ts
import { log } from "@devix-cli/logger";

log("hello from Devix");
```

## API

| Export | Description            |
| ------ | ---------------------- |
| `log`  | Emit a single log line |

> Note: this package is intentionally minimal in 0.1.0. Structured levels, sinks and formatting are planned for a future release — see the [roadmap](https://github.com/hauchdev/Devix/blob/main/ROADMAP.md).

## Guarantees

- **Zero dependencies.**
- **Strict TypeScript, ESM only**, Node.js 22+.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
