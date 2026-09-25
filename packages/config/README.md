# @devix-cli/config

> Devix configuration loading: strict JSON, upward search, typed errors. Config is data, never code.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit.

## Install

```bash
npm install @devix-cli/config
```

## Example

Given a `devix.config.json` (or `devix.json`) anywhere up the tree:

```json
{
  "name": "my-project",
  "features": { "doctor": true, "git": true }
}
```

```ts
import { loadConfig, readConfigFile, ConfigError } from "@devix-cli/config";

// Walks up from cwd until the nearest config file; undefined when none exists
const config = await loadConfig({ cwd: process.cwd() });

// Or read a specific known path
const explicit = await readConfigFile("/path/to/devix.config.json");

try {
  await readConfigFile("/path/to/wrong-name.json");
} catch (error) {
  if (error instanceof ConfigError && error.code === "EUNSUPPORTED_FORMAT") {
    console.error("only devix.config.json / devix.json are valid names");
  }
}
```

## Config schema

| Key               | Type      | Description                  |
| ----------------- | --------- | ---------------------------- |
| `name`            | `string`  | Project name used in reports |
| `features.doctor` | `boolean` | Enable the doctor command    |
| `features.git`    | `boolean` | Enable git helpers           |
| `features.deps`   | `boolean` | Enable dependency helpers    |

Unknown keys are rejected (`EINVALID_CONFIG`) to catch typos early. An empty file is valid and yields `{}`.

## API

| Export                               | Description                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `loadConfig(options?)`               | Upward search from `cwd` (default `process.cwd()`); `undefined` when absent |
| `readConfigFile(path)`               | Read + validate a specific config file                                      |
| `parseConfigContent(path, content)`  | Parse + syntax-check a config string                                        |
| `validateConfigShape(value)`         | Returns the list of shape problems (empty = valid)                          |
| `CONFIG_FILE_NAMES`                  | `["devix.config.json", "devix.json"]`, priority order                       |
| `DevixConfig`, `DevixConfigFeatures` | Types                                                                       |
| `ConfigError`                        | Typed error (`EINVALID_CONFIG`, `EUNSUPPORTED_FORMAT`, `EPARSE`, `EIO`)     |

## Guarantees

- **JSON only, no JavaScript.** No `eval`, no `new Function`, no dynamic `import()` of user files — config is data.
- **Nearest file wins.** The upward search stops at the first config found.
- **Typed errors** with the offending path attached.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
