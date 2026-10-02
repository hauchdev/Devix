# Devix — Development Guide

Practical guide for developing, testing and maintaining Devix.

> **Devix** is a modular developer toolkit, built as a monorepo with TypeScript, pnpm and Turborepo.

---

## 1. Requirements

| Tool    | Version    | Notes                                    |
| ------- | ---------- | ---------------------------------------- |
| Node.js | LTS (22.x) | Project runtime                          |
| pnpm    | 12.5.1     | Pinned in `packageManager`; use Corepack |
| Git     | 2.x        |                                          |

Activate the pinned pnpm version:

```bash
corepack enable
corepack prepare pnpm@12.5.1 --activate
```

Check the installation:

```bash
node --version   # v22.x
pnpm --version   # 12.5.1
git --version
```

---

## 2. Getting started

```bash
git clone https://github.com/hauchdev/Devix.git
cd Devix
pnpm install
```

Verify everything works:

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

All four commands must finish without errors before you start coding.

---

## 3. Commands

All commands run from the repository root.

| Command              | What it does                                                  |
| -------------------- | ------------------------------------------------------------- |
| `pnpm install`       | Install dependencies for the whole workspace                  |
| `pnpm build`         | Build all packages (dependency order respected)               |
| `pnpm test`          | Run tests (Vitest)                                            |
| `pnpm lint`          | Analyze code (ESLint)                                         |
| `pnpm typecheck`     | Type-check without emitting output                            |
| `pnpm format`        | Format code (Prettier)                                        |
| `pnpm clean`         | Remove build artifacts (`dist/`)                              |
| `pnpm dev`           | Reserved for CLI watch mode (no tasks yet)                    |
| `pnpm verify`        | Run lint, typecheck, test, build and prettier --check         |
| `pnpm test:coverage` | Run tests with v8 coverage and enforce the per-package floors |
| `pnpm format:check`  | Check formatting without writing                              |

### CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push to `main` and on every Pull Request:

```text
install --frozen-lockfile → format check → lint → typecheck → test → build
```

Matrix: **ubuntu-latest** (Node 22 and 24) and **windows-latest** (Node 22) — Windows is checked on every PR because it is a target platform for Devix. The workflow reads the pnpm version from the `packageManager` field and caches `.turbo` per runner.

### Working on a single package

Use pnpm filters to avoid running the whole monorepo:

```bash
pnpm --filter @devix-cli/core build
pnpm --filter @devix-cli/core test
pnpm --filter @devix-cli/core typecheck
```

### Adding dependencies

```bash
# Root dependency (shared tooling)
pnpm add -Dw <package>

# Dependency for a specific package
pnpm --filter @devix-cli/core add -D <package>

# Internal dependency between packages (always like this)
pnpm --filter @devix-cli/logger add @devix-cli/core@workspace:*
```

> **Note on strict pnpm:** each package can only import what it declares in its `package.json`. Shared tooling (ESLint config, TypeScript, Vitest) lives at the root; packages declare only what they run directly (e.g. the `eslint` binary).

---

## 4. Monorepo structure

```text
Devix/
├── apps/
│   └── cli/                  # Devix CLI (oclif) ✓
│
├── packages/
│   ├── core/                 # Shared foundations ✓
│   ├── output/               # Canonical output shapes and exit codes
│   ├── cache/                # TTL filesystem cache for tool probes
│   ├── logger/               # Centralized logging ✓ (deprecated)
│   ├── config/               # Configuration loading ✓
│   ├── filesystem/           # FS abstractions ✓
│   ├── shell/                # Process execution ✓
│   ├── project-detector/     # Project detection ✓
│   ├── git/                  # Git operations ✓
│   ├── doctor/               # Environment and project diagnostics ✓
│   └── deps/                 # Package manager delegation ✓
│
├── plugins/                  # Optional integrations (docker, minecraft, web) ✓
├── docs/                     # Specific documentation ✓
├── .changeset/               # Versioning and releases ✓
├── .github/                  # CI and releases ✓
│
├── turbo.json                # Turborepo orchestration
├── tsconfig.json             # Base strict TypeScript
├── eslint.config.js          # Shared ESLint flat config
├── .prettierrc               # Shared formatting
└── pnpm-workspace.yaml       # apps/*, packages/*, plugins/*
```

---

## 5. Dependency architecture

Dependency direction is strict and unidirectional:

```text
apps/cli            (top layer: user interface)
   ↓
plugins             (optional integrations, decoupled)
   ↓
services / features (project-detector, git, doctor…)
   ↓
packages            (filesystem, shell, config, logger)
   ↓
core                (foundations, no internal dependencies)
```

Rules:

1. **Single responsibility.** Each package solves one concrete problem. There is no generic `packages/utils`.
2. **The CLI contains no business logic.** Commands coordinate; packages implement.
3. **Base packages never depend on the CLI** or upper layers.
4. **Internal dependencies always use `workspace:*`.**
5. **Reuse:** if two commands need the same thing, it becomes a package or service.

---

## 6. TypeScript

The base config (`tsconfig.json` at root) is strict:

```jsonc
{
  "target": "ES2022",
  "module": "NodeNext",
  "moduleResolution": "NodeNext",
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "isolatedModules": true,
}
```

Each package extends the root:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Rules:

- All packages are **ESM** (`"type": "module"`).
- `any` is forbidden: prefer `unknown` and explicit types.
- No `@ts-ignore` or disabling `strict` without a documented technical reason.

### Note: why TypeScript 6.x and not 7

The project uses **TypeScript 6.0.3** (latest stable with the classic API). TypeScript 7.0 (native compiler) **does not yet expose a stable programmatic API** — that arrives with 7.1 — and `typescript-eslint` needs it to work. Migration will be re-evaluated when 7.1 is released.

---

## 7. Tests

Framework: **Vitest**. Each package keeps its tests in `tests/`:

```text
packages/logger/
├── src/index.ts
└── tests/logger.test.ts
```

Conventions:

- Tests import from `../src/...` directly (no build required).
- Cover: normal cases, empty cases, missing files, invalid projects.
- Cross-platform behavior (Windows/Linux/macOS) is tested with `node:path` and Node APIs, never with hardcoded paths.
  A hardcoded `"\\"` in a path assertion passes on Windows and fails on Linux CI — use `relative()` and `sep`.

### Coverage

Every package opts into a shared Vitest configuration:

```ts
// packages/<name>/vitest.config.ts
import { defineConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default defineConfig(sharedTestConfig("@devix-cli/<name>"));
```

Coverage floors live in `vitest.shared.ts`, one per package:

```bash
pnpm test:coverage   # runs every package with v8 coverage and enforces the floors
```

Two rules keep the floors meaningful:

- **A floor nobody meets is theatre.** Each one is set at what the package actually achieves, so a regression fails and an improvement can raise it.
- **Test the logic, inject the environment.** Anything that shells out takes a runner (`DockerClient`, `createToolProbe`, `DepsRunner`, `GitRunner`). A test that only asserts "if the real machine has Docker, fine" covers nothing.

---

## 8. Quality: lint and format

- **ESLint 9** with flat config at the root (`eslint.config.js`), inherited automatically by all packages.
- Highlighted rule: `@typescript-eslint/no-explicit-any: error`.
- **Prettier** for formatting: `pnpm format` (or let your IDE apply it on save).

Checklist before considering something done:

```bash
pnpm verify
```

All five stages must pass.

---

## 9. Git and commits

### Branches

Short, descriptive branches from `main`:

```text
feat/project-detector
feat/doctor-command
fix/windows-paths
refactor/logger
docs/plugin-system
chore/update-dependencies
```

`main` always represents a stable state. There is no `develop` branch.

### Conventional Commits

```text
feat:     new feature           feat(project): detect pnpm workspaces
fix:      bug fix               fix(cli): handle missing project
docs:     documentation         docs: document plugin architecture
test:     tests                 test(project): add detector fixtures
refactor: refactoring           refactor(core): simplify project context
perf:     performance           perf(detector): cache project detection
ci:       continuous integration ci: add pull request checks
chore:    maintenance           chore: update dependencies
```

Each commit represents a real change. No artificial commits.

### Typical workflow

```bash
git switch main
git pull
git switch -c feat/my-feature

# ... develop ...

pnpm verify

git status          # check no artifacts slip in
git add <files>
git commit -m "feat(scope): describe the change"
git push -u origin feat/my-feature
```

### Pull Requests

A PR must:

- have a descriptive title (`feat(project): add Node.js detection`)
- explain **what** changes and **why**
- include tests when appropriate
- pass CI
- not mix unrelated changes

---

## 10. Versioning and releases

- **Semantic Versioning**: `MAJOR.MINOR.PATCH` (0.1.0, 0.2.1, 1.0.0…).
- **Changesets** to record user-facing changes:

```bash
pnpm changeset        # create a changeset describing the change
```

Changesets accumulate in `.changeset/` and are consumed on release. Do not edit changelogs manually.

---

## 11. Roadmap

The phased plan, with acceptance criteria and current status, lives in [ROADMAP.md](./ROADMAP.md).

---

## 12. Troubleshooting

**`pnpm build` fails with `invalid_package_manager_field`**
The `packageManager` field must have full semver (`pnpm@12.5.1`, not `pnpm@12`). Check you are using the pinned version: `corepack prepare pnpm@12.5.1 --activate`.

**A package cannot find a dependency from another package**
With strict pnpm there is no hoisting. Declare the dependency in the package's `package.json` with `workspace:*`.

**ESLint fails with `Cannot find package` in `eslint.config.js`**
The config lives at the root, so `@eslint/js` and `typescript-eslint` must be in the root **devDependencies**. Packages only need `eslint` (the binary).

**Turbo warns `no output files found for task ...#test`**
Expected: the `test` task declares `coverage/**` as output, which only exists when coverage is enabled. Not an error.

**After `pnpm clean`, `pnpm build` is instant**
Turborepo restores outputs from its local cache. The build is correct.

**CI fails on "Format check" but local passes (CRLF on Windows)**
The repo forces LF via `.gitattributes` (`* text=auto eol=lf`); Prettier requires LF. If you see differences between your machine and CI, check `git ls-files --eol` and make sure to commit with the file saved to disk (open IDE buffers may overwrite changes). The verification checklist **always includes** `prettier --check .` — it is the same one CI runs.

**TS2591 errors: `Cannot find name 'node:fs'` / `Cannot find namespace 'NodeJS'`**
The package imports Node builtins but cannot see their types. `@types/node` must be at the **root** (version aligned with LTS: `@types/node@22`) and the root tsconfig declares `"types": ["node"]` — automatic `@types` resolution does not go up directories in pnpm workspaces, explicit does.

---

## 13. Rules for AI agents

Read `AGENTS.md` at the root (and the `AGENTS.md` of the relevant subdirectory when it exists) before modifying code.

AI agents must not:

- change architecture without a justified reason
- introduce unnecessary dependencies
- disable `strict` or ignore TypeScript errors
- delete tests to make the suite pass
- modify public APIs without documenting it
- make unrelated changes
- generate artificial commits

---

## 14. Core principle

Devix grows through **real functionality**, not artificial commits.

```text
Correctness > Maintainability > Developer Experience > Performance > Feature count
```

A good commit:

```text
feat(project): detect pnpm workspaces
```

The number of commits is not the goal. The goal is a useful, maintainable and technically solid tool.
