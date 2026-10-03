# @devix-cli/ui

## 0.3.0

### Minor Changes

- c11f700: Make a bare `devix` an introduction instead of a command reference.

  Running `devix` with no arguments printed oclif's help text: a list of
  what exists, with no idea where the user actually is. It now opens a
  panel that answers the question a newcomer has first — what is this
  directory, is my environment healthy, what do I do next — and suggests
  only the commands that apply to what it found. A clean environment gets
  no "run doctor anyway" noise; an unpushed branch gets `git sync` at the
  top. `devix home` reaches the same panel by name, `--json` emits the same
  snapshot as data, `--verbose` adds the detection tree, and `--help` and
  `--version` still belong to oclif.

  The layout comes from the new `Deck` primitives in `@devix-cli/ui`, so
  the panel degrades the same way the rest of the CLI does: ASCII and no
  color on a legacy console, stacked cards on a narrow terminal, and a
  meter that drops to plain counts when a bar would not fit. Each probe is
  individually optional — no repository, no Docker and missing tools are
  all rendered as facts, because a welcome screen that fails is worse than
  one that admits it does not know.

- 701f911: Add Rich-style layout primitives and a semantic colour theme.

  `Deck` brings the shapes that make output look composed rather than
  printed: a box whose title sits in its own top border, a grid of cards,
  a proportional meter, a tree with real box-drawing connectors, key caps
  and wrapping chips. `Painter` and `Theme` separate what a _meaning_ looks
  like from the mechanism that emits the escape codes, so the palette lives
  in one place.

  `Ui.deck` exposes them through the renderer that already detects
  capabilities, so a command gets themed output without re-detecting
  anything. Nothing existing changed: `Styler`, `Ui` and every current
  method keep their behaviour, and the ASCII symbol set is still enforced
  as printable ASCII by a test.

  Two sizing bugs found while writing the tests, both of which the width
  tests now cover: a card row overflowed the terminal because the last
  column's rule was counted one character short, and a meter measured its
  bar against a label column that had already been truncated for display.

## 0.2.0

### Minor Changes

- b0dfbc8: Rework the entire terminal interface.

  **New `@devix-cli/ui` package** with zero dependencies: capability detection (color level, Unicode support, clamped width), a restrained 256-color theme, and layout components (title, heading, fields, table, panel, list, hint).

  **Every console is supported.** Color follows `FORCE_COLOR`/`NO_COLOR`/`TERM`/`COLORTERM`/TTY. Unicode follows the locale on Unix and the emulator on Windows, where legacy consoles still mangle box drawing. Narrow terminals from 32 to 100 columns are handled: long values truncate, tables shrink their widest column but never below a column's longest token, so identifiers stay readable.

  **All commands migrated** to the new renderer: `status`, `doctor`, `detect`, `git status|branches|diff|sync`, `deps`, `docker`, `minecraft`, `web`, `config` and `plugin list`. Every command now shares the same flags: `--json`, `--cwd`, `--no-color`, `--quiet`, `--verbose`, `--config`.

  > **Breaking change:** human-readable output is now a designed layout instead of ad-hoc `Label: value` lines. Scripts parsing stdout should use `--json`.
