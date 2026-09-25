# @devix-cli/core

> Foundations of Devix: the version constant and the plugin API.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. Everything else in the monorepo builds on this package, which itself has zero dependencies.

## Install

```bash
npm install @devix-cli/core
```

## What's inside

### Version constant

```ts
import { DEVIX_VERSION } from "@devix-cli/core";

console.log(DEVIX_VERSION); // the Devix release this package ships with
```

### Plugin API (metadata only)

Plugins are manifest metadata, never dynamic code. The registry validates shapes and ids, rejects duplicates and preserves registration order. It never `eval`s, never uses `new Function` and never imports plugin code — loading third-party code is a deliberate human decision outside this API.

```ts
import { PluginError, PluginRegistry } from "@devix-cli/core";

const registry = new PluginRegistry((message) => new PluginError(message, "EINVALID"));

registry.register({
  id: "docker",
  name: "Docker",
  version: "0.1.0",
  description: "Docker diagnostics: availability, containers and images.",
  commands: ["docker"],
});

registry.all(); // [{ manifest: { id: "docker", … } }]
registry.has("docker"); // true
```

## API

| Export             | Kind  | Description                                                  |
| ------------------ | ----- | ------------------------------------------------------------ |
| `DEVIX_VERSION`    | const | Devix version string shipped with the package                |
| `PluginRegistry`   | class | Validated plugin manifest registry keyed by stable plugin id |
| `PluginError`      | class | Typed error (`EINVALID`, `EDUPLICATE`, `EINCONSISTENT`)      |
| `PluginManifest`   | type  | `id`, `name`, semver `version`, `description`, `commands?`   |
| `RegisteredPlugin` | type  | A registered manifest                                        |

## Guarantees

- **No dependencies.** Core imports nothing, not even other Devix packages.
- **Data is data, never code.** Manifests are validated plain objects.
- **Strict TypeScript, ESM only**, Node.js 22+.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Plugins guide](https://github.com/hauchdev/Devix/blob/main/docs/plugins.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
