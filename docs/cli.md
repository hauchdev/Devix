# CLI

The `devix` executable lives at [`apps/cli`](../apps/cli) and is built with oclif. Commands are compiled TypeScript discovered from `dist/commands` — there is no runtime transpilation.

## Running from source

```bash
pnpm install
pnpm build

node apps/cli/bin/run.js --help
node apps/cli/bin/run.js --version
```

## Commands

### `devix detect`

Summarizes the current project's stack.

```bash
devix detect            # human-readable summary
devix detect --json     # machine-readable
devix detect --cwd ../other/project
```

### `devix doctor`

Diagnoses the environment and the project.

```bash
devix doctor            # ✓/✗ tool versions + project summary
devix doctor --json
```

Checks Node.js, pnpm, npm, Yarn, Bun and Git versions, then reports the detected languages, package managers and tools.

### `devix git`

Read-only Git operations. Devix never runs state-changing Git commands without explicit confirmation, so `sync` prints what it would do instead of doing it.

```bash
devix git status        # branch + changed paths (porcelain v2 based)
devix git status --json
devix git branches      # local branches, current one marked
devix git diff          # per-file line counts vs HEAD
devix git sync          # ahead/behind + the commands to run yourself
```

### `devix deps`

Delegates to whichever package manager the project uses (lockfile precedence: pnpm, yarn, bun, npm; bare `package.json` means npm).

```bash
devix deps list         # manager's native list output
devix deps outdated
devix deps audit
```

### `devix docker`

Docker diagnostics with graceful degradation.

```bash
devix docker status     # CLI + daemon availability and version
devix docker ps         # running containers
devix docker images
```

### `devix minecraft`

Minecraft scaffolding and detection, powered by the `@devix-cli/minecraft` plugin.

```bash
devix minecraft list                          # kinds, platforms and optional modules
devix minecraft init <platform> <name>        # scaffold a mod/plugin/proxy skeleton
devix minecraft init fabric+forge "DualSword" --mc 1.21.1   # multi-loader project
devix minecraft init paper "QueueBoard" --modules api,core  # multi-module project
devix minecraft init --kind proxy-plugin "Relay"            # by kind (default platform)
devix minecraft init fabric "Cool Sword" --dry-run --json
devix minecraft init                          # interactive: kind -> platforms -> modules -> name -> ...
devix minecraft check [platform]              # detect an existing Minecraft project
devix minecraft check --json
```

`init` flags: `--kind` (mod, plugin, proxy-plugin), `--modules` (api, core, game-tests, datagen), `--cwd` (parent directory), `--here` (scaffold into the directory itself instead of a project subfolder), `--package`, `--version`, `--mc` (Minecraft version: `26.3`, `1.21.1`, alias `stable`/`legacy`), `--dry-run`, `--overwrite`, `--json`.

`init` supports multi-loader projects (combine Gradle mod loaders with `+`: `fabric+forge`, `fabric+neoforge`, … — one shared version catalog, one subproject per loader), multi-module projects (extra `api`/`core`/`game-tests`/`datagen` subprojects) and multi-version targeting (every dependency line comes from a version catalog keyed by Minecraft version; unsupported combinations fail with `EUNSUPPORTED_VERSION`). Architectury picks its second loader from the version: Forge on legacy lines, NeoForge on modern ones.

`init` never overwrites existing files and refuses destinations that already look like a Minecraft project (pass `--overwrite` to skip existing files, and see the plugin README for `allowExistingProject`). `check` reports every detected platform with its manifest detail and, when a platform id is given, whether that specific one matched.

On an interactive terminal, `init` asks for whatever is missing, in order: the project kind, the target platform(s) (multi-select), the optional extra modules, then the project name and the version/package/Minecraft-version details. Scripts and automation must pass the platform (or `--kind`) and the name — non-interactive input fails with the usage message, and `--json` always requires them as arguments.

### `devix plugin list`

Lists installed plugins and the commands they contribute.

```bash
devix plugin list
devix plugin list --json
```

## Exit codes

- `0` — success.
- `1` — user-facing failure (not a repository, tool missing, command failed).

Errors are one line and actionable; stack traces never reach end users.
