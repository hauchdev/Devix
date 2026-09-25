# @devix-cli/filesystem

> Cross-platform filesystem abstractions for Devix: typed errors, safe path traversal and JSON helpers.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. Raw `node:fs` errors never escape this package: every failure becomes a `FilesystemError` with a machine-readable code.

## Install

```bash
npm install @devix-cli/filesystem
```

## Example

```ts
import { findUp, isFile, readJson, resolveWithin, walkUp } from "@devix-cli/filesystem";

// Find the nearest file walking up, like .git or package.json
const root = await findUp(process.cwd(), "package.json");

// Iterate every ancestor directory
for await (const dir of walkUp(process.cwd())) {
  if (await isFile(`${dir}/devix.config.json`)) break;
}

// Parse JSON with a typed error on invalid content
const pkg = await readJson<{ name: string }>(`${root}/package.json`);

// Resolve inside a base directory; throws EPATH_ESCAPE on traversal
const safe = resolveWithin(root, "src/index.ts");
```

## API

| Export                             | Description                                                               |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `exists`, `isFile`, `isDirectory`  | Existence checks                                                          |
| `readFileString`, `readFileBuffer` | File reads with typed `ENOENT` / `EISDIR` errors                          |
| `writeFileString`                  | File writes (optional parent-directory creation)                          |
| `readJson`                         | JSON read + parse, `EINVALID_JSON` on malformed content                   |
| `walkUp`, `findUp`                 | Ancestor iteration / nearest-file search (both async generators-friendly) |
| `resolveWithin`                    | Path join that refuses to escape the base directory (`EPATH_ESCAPE`)      |
| `listDir`, `listDirSafe`           | Directory listings; the safe variant skips unreadable entries             |
| `FilesystemError`                  | Typed error with `code` and `path`                                        |

Error codes: `ENOENT`, `EISDIR`, `ENOTDIR`, `EEXIST`, `EINVALID_JSON`, `EPATH_ESCAPE`, `EIO`.

## Guarantees

- **Cross-platform.** Always `node:path`; Windows is a first-class target, not an afterthought.
- **Traversal-safe.** `resolveWithin` is the single approved way to join user-relative paths onto a base.
- **Typed errors only.** No raw errno objects, no surprises in `catch`.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
