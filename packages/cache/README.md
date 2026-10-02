# @devix-cli/cache

TTL filesystem cache for Devix tool probes and expensive computations.

## API

```ts
import { Cache } from "@devix-cli/cache";

const cache = new Cache(); // defaults to ~/.cache/devix

await cache.set("pnpm:version", { version: "9.0.0" }, 60_000);
const cached = await cache.get("pnpm:version");
```

## Guarantees

- **Depends on `@devix-cli/filesystem`** for safe reads/writes.
- **Strict TypeScript, ESM only**, Node.js 22+.
