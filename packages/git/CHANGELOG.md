# @devix-cli/git

## 0.1.0

### Minor Changes

- First public release: the Devix CLI (`npm i -g devix-cli`) with `status`, `detect`, `doctor`, read-only `git` commands, dependency delegation through the detected package manager, Docker diagnostics with graceful degradation, and the `@devix-cli/*` service packages powering them.
- 6f89940: Adds the `@devix-cli/git` package over `@devix-cli/shell`: `repositoryRoot`/`isRepository` via `rev-parse`, `status` from `git status --porcelain=v2 --branch` (branch, staged/unstaged/untracked/conflicted entries), `branches` and `currentBranch` via `for-each-ref`, and a read-only `diffStat`. All execution goes through an injectable `GitRunner`; the default one spawns argv arrays only and never mutates the repository.

### Patch Changes

- Updated dependencies
  - @devix-cli/shell@0.1.0
