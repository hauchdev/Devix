---
"devix-cli": minor
---

Introduce `DevixCommand`, a base command class with shared flags (`--json`, `--cwd`, `--no-color`, `--quiet`, `--verbose`, `--config`) and helpers to emit the canonical `{ ok, data | error }` output shape. Switched internal CLI dependencies to `workspace:*`.
