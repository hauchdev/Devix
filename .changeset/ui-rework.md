---
"@devix-cli/ui": minor
"devix-cli": major
"@devix-cli/minecraft": patch
---

Rework the entire terminal interface.

**New `@devix-cli/ui` package** with zero dependencies: capability detection (color level, Unicode support, clamped width), a restrained 256-color theme, and layout components (title, heading, fields, table, panel, list, hint).

**Every console is supported.** Color follows `FORCE_COLOR`/`NO_COLOR`/`TERM`/`COLORTERM`/TTY. Unicode follows the locale on Unix and the emulator on Windows, where legacy consoles still mangle box drawing. Narrow terminals from 32 to 100 columns are handled: long values truncate, tables shrink their widest column but never below a column's longest token, so identifiers stay readable.

**All commands migrated** to the new renderer: `status`, `doctor`, `detect`, `git status|branches|diff|sync`, `deps`, `docker`, `minecraft`, `web`, `config` and `plugin list`. Every command now shares the same flags: `--json`, `--cwd`, `--no-color`, `--quiet`, `--verbose`, `--config`.

> **Breaking change:** human-readable output is now a designed layout instead of ad-hoc `Label: value` lines. Scripts parsing stdout should use `--json`.
