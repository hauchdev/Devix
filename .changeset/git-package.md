---
"@devix/git": minor
---

Adds the `@devix/git` package over `@devix/shell`: `repositoryRoot`/`isRepository` via `rev-parse`, `status` from `git status --porcelain=v2 --branch` (branch, staged/unstaged/untracked/conflicted entries), `branches` and `currentBranch` via `for-each-ref`, and a read-only `diffStat`. All execution goes through an injectable `GitRunner`; the default one spawns argv arrays only and never mutates the repository.
