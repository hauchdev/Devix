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
devix minecraft list                    # the eight supported platforms
devix minecraft init <platform> <name>  # scaffold a mod/plugin skeleton
devix minecraft init fabric "Cool Sword" --dry-run --json
devix minecraft check [platform]        # detect an existing Minecraft project
devix minecraft check --json
```

`init` flags: `--cwd` (parent directory), `--here` (scaffold into the directory itself instead of a project subfolder), `--package`, `--version`, `--mc`, `--dry-run`, `--overwrite`, `--json`.

`init` never overwrites existing files and refuses destinations that already look like a Minecraft project (pass `--overwrite` to skip existing files, and see the plugin README for `allowExistingProject`). `check` reports every detected platform with its manifest detail and, when a platform id is given, whether that specific one matched.

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
