---
"@devix/cli": minor
---

Adds `devix status`: one read-only glance combining project detection, environment tool checks, git ahead/behind and docker availability, with a `--json` flag. The package is now installable globally (`pnpm add -g` from `apps/cli`, or `pnpm link` from the repository) so `devix` runs directly in cmd, PowerShell and POSIX shells; see the README for the exact commands.
