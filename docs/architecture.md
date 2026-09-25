# Architecture

Devix is a pnpm + Turborepo monorepo of small, focused packages. Dependencies only flow downward, always via `workspace:*`:

```text
apps/cli            (user interface)
   ↓
plugins             (optional integrations: docker)
   ↓
services            (deps, doctor, git, project-detector)
   ↓
packages            (filesystem, shell, config, logger)
   ↓
core                (foundamentals, no internal deps)
```

## Layers

### `@devix-cli/core`

Foundations with zero internal dependencies: the Devix version constant and the plugin API (`PluginRegistry`, `PluginManifest`, `PluginError`). The plugin API is metadata-only — it never loads dynamic code.

### `packages/*`

Cross-platform building blocks. Each one owns a typed error hierarchy and never leaks raw Node errors:

- **`@devix-cli/filesystem`** — read/write, existence checks, `walkUp`/`findUp`, safe path resolution (`resolveWithin` guards against traversal).
- **`@devix-cli/shell`** — controlled process execution: argv arrays only, no `shell: true`, output limits, timeouts, abort support, and a Windows guard (`EUNSAFE_ARG`) for `.cmd`/`.bat` shims.
- **`@devix-cli/config`** — `devix.config.json` / `devix.json` loading with upward search. JSON is data, never code: no `eval`, no dynamic `import()` of user files.
- **`@devix-cli/logger`** — centralized logging.

### Services

- **`@devix-cli/project-detector`** — extensible detector registry. Each detector is a self-contained unit with a stable id, declared markers and a category; "not found" is never an error.
- **`@devix-cli/git`** — read-first Git operations over `@devix-cli/shell` through an injectable `GitRunner`.
- **`@devix-cli/doctor`** — environment and project diagnostics as a pure service, with injectable tool-version resolution.
- **`@devix-cli/deps`** — package manager detection plus delegation of read-only commands.

### `plugins/*`

Optional integrations decoupled from core services. **`@devix-cli/docker`** degrades gracefully: a missing CLI or stopped daemon is an availability report, not a thrown error.

### `apps/cli`

The `devix` executable, built on oclif. Commands only coordinate: they parse input, call a service and print output. Business logic never lives here.

## Cross-cutting rules

1. Strict TypeScript everywhere (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
2. Windows is a target platform: `node:path` always, POSIX assumptions never.
3. Typed errors per package; raw Node errors never escape.
4. No hidden singletons: everything configurable goes through parameters.
5. Every package ships `build` / `test` / `lint` / `typecheck` scripts, wired through Turborepo.
