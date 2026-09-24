# Contributing to Devix

Thanks for your interest! This document summarizes how to work inside the repo so your contribution reaches `main` quickly.

## Requirements

- **Node.js 22 LTS**
- **pnpm 12.5.1** (pinned via `packageManager`; activate it with Corepack):

```bash
corepack enable
corepack prepare pnpm@12.5.1 --activate
```

- **Git 2.x**

## Getting started

```bash
git clone https://github.com/hauchdev/Devix.git
cd Devix
pnpm install

pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

All four commands must be green before you start coding.

## Project rules

1. **Strict TypeScript:** no `any`, no `@ts-ignore`. The monorepo uses `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
2. **Unidirectional dependency architecture:** `apps/cli → plugins → services → packages → core`. A base package never imports from an upper layer. Internal dependencies always via `workspace:*`.
3. **Cross-platform is mandatory:** Windows is a target platform. Use `node:path`, never concatenate paths by hand, and don't assume specific binaries in tests.
4. **Typed errors per package** (`FilesystemError`, `ShellError`, `ConfigError`): never leak raw Node errors.
5. **Configuration = data, never code:** no `eval` and no dynamic `import()` of user project files.
6. **No unnecessary dependencies:** if Node's standard library solves it, don't add a package.

## Workflow

```bash
git switch main
git pull
git switch -c feat/my-feature

# ... develop ...

pnpm lint && pnpm typecheck && pnpm test && pnpm build
npx prettier --check .

git add <files>
git commit -m "feat(scope): describe the change"
git push -u origin feat/my-feature
```

- Short, descriptive branches from `main` (`feat/...`, `fix/...`, `docs/...`, `chore/...`).
- **Conventional Commits** required:

  | Type       | Use                    |
  | ---------- | ---------------------- |
  | `feat`     | new feature            |
  | `fix`      | bug fix                |
  | `docs`     | documentation          |
  | `test`     | tests                  |
  | `refactor` | refactoring            |
  | `perf`     | performance            |
  | `ci`       | continuous integration |
  | `chore`    | maintenance            |

## Pull Requests

A PR must:

- have a conventional title: `feat(project): detect pnpm workspaces`
- explain **what** changes and **why**
- include tests for any new behavior
- pass the full CI (format, lint, typecheck, test, build on ubuntu + windows)
- not mix unrelated changes

## Tests

- Framework: **Vitest**. Tests live in `tests/` inside each package.
- Cover: normal, empty, missing and invalid cases.
- Filesystem fixtures: `mkdtemp` in `os.tmpdir()`, never committed fixtures.
- Use `process.execPath` (node) in process tests, not binaries that may not exist.

## Versioning

- **Changesets**: if your change affects users, add one with `pnpm changeset` and include it in the PR.
- **Semantic Versioning** across all packages.

## Reporting bugs and proposing features

Open an issue with the matching template ([bug](.github/ISSUE_TEMPLATE/bug_report.md) / [feature](.github/ISSUE_TEMPLATE/feature_request.md)). For vulnerabilities, use the private process in [SECURITY.md](./SECURITY.md) — never a public issue.

By participating in this community you accept the [code of conduct](./CODE_OF_CONDUCT.md).
