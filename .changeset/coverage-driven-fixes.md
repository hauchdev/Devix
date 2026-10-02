---
"@devix-cli/docker": minor
"@devix-cli/doctor": patch
"@devix-cli/git": patch
"@devix-cli/deps": patch
---

Quality work driven by the new coverage floors.

**Docker** is now testable without a daemon: the CLI logic moved into a `DockerClient` over an injectable `DockerRunner`, and the command handlers accept an injected client. Coverage went from 32% to 96%, and the tests no longer depend on whether the machine happens to have Docker.

**Doctor** gained an injectable probe runner, so version parsing is covered deterministically instead of only against the real machine.

**Git** `diffStat` now reports `0` instead of `NaN` when a `--numstat` count column is missing or unparseable.
