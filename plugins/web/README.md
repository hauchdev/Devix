# @devix-cli/web

Web project integration for Devix: detect frameworks, inspect environment variables, list scripts and print build/serve commands.

## Install

```bash
npm install @devix-cli/web
```

## API

```ts
import { detectWebProject, listEnvVariables, listScripts } from "@devix-cli/web";

const detection = await detectWebProject({ root: process.cwd() });
// { root, isWeb: true, frameworks: [{ id: "next", label: "Next.js", package: "next" }] }

const variables = await listEnvVariables({ root: process.cwd() });
// [{ name: "DATABASE_URL", source: ".env" }]  ← names only, never values

const scripts = await listScripts({ root: process.cwd() });
// [{ name: "dev", command: "next dev" }]
```

### Static server

```ts
import { serveStatic } from "@devix-cli/web";

const server = await serveStatic({ root: "./dist", port: 4173 });
// http://127.0.0.1:4173
await server.close();
```

The server is read-only, dependency-free and refuses any path that escapes its root.

## Guarantees

- **Values are never read.** `listEnvVariables` returns variable names and their source file only.
- **Print-first.** `build` and `serve` print the command to run; they never execute it.
- **Graceful degradation.** A missing build output is `undefined`, not an error.
- **Strict TypeScript, ESM only**, Node.js 22+.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
