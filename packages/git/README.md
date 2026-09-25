# @devix-cli/git

> Safe, read-first Git operations for Devix: status, branches, diff and sync state. Never mutates your repository.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. Built on [`@devix-cli/shell`](https://www.npmjs.com/package/@devix-cli/shell) with an injectable `GitRunner` for tests.

## Install

```bash
npm install @devix-cli/git
```

## Example

```ts
import { branches, diffStat, isRepository, status, syncState, GitError } from "@devix-cli/git";

if (await isRepository(process.cwd())) {
  const st = await status(process.cwd());
  st.branch; // "main", or undefined on a detached HEAD
  st.hasCommits; // false right after git init
  st.entries; // [{ path, index, workingTree, conflicted }]

  const bs = await branches(process.cwd());
  bs.filter((b) => b.current); // [{ name, commit, current: true }]

  const diff = await diffStat(process.cwd());
  diff.entries; // [{ path, additions, deletions, binary }]

  const sync = await syncState(process.cwd());
  sync; // { upstream: "origin/main", ahead: 1, behind: 0 }
}

try {
  await status("/not/a/repo");
} catch (error) {
  if (error instanceof GitError && error.code === "EGIT_NOT_A_REPO") {
    console.error("this is not a git repository");
  }
}
```

## API

| Export                                                  | Description                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `isRepository(dir)`, `repositoryRoot(dir)`              | Repository detection and root resolution                                     |
| `status(dir, runner?)`                                  | Branch + changed paths (`git status --porcelain=v2`)                         |
| `branches(dir, runner?)`, `currentBranch(dir, runner?)` | Local branches with the current one marked                                   |
| `syncState(dir, runner?)`                               | Ahead/behind against the upstream                                            |
| `diffStat(dir, runner?)`                                | Per-file line counts vs HEAD (`git diff HEAD --numstat`)                     |
| `defaultGitRunner`, `GitRunner`                         | Injectable execution layer (tests use a fake)                                |
| `GitError`                                              | Typed error (`EGIT_NOT_FOUND`, `EGIT_NOT_A_REPO`, `EGIT_FAILED`, `EINVALID`) |

## Guarantees

- **Read-only by design.** Every function inspects; none mutates refs, index or working tree.
- **Fixed arguments only.** No user input is ever interpolated into a git command line.
- **Machine-readable formats.** Porcelain v2 and numstat — stable columns, no fragile human output parsing.
- **Typed errors** with clear one-line messages.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
