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

- 7be629e: Answer the interactive prompts with the arrow-key menu, and add `--here`.

  On a TTY, `devix minecraft init` now asks for the project kind, the
  platforms and the modules with the same keyboard-navigable menu as
  `devix minecraft` itself: typing filters, space toggles, Enter confirms.
  In a pipe the numbered list is unchanged, so the command stays
  scriptable, and the menu gains the multi-select it was documented to
  have but never implemented.

  `devix detect`, `devix doctor` and `devix` take `--here` to inspect
  exactly the given directory instead of walking up to the nearest project
  marker. Walking up is right inside a project; it is wrong for a
  directory that merely happens to sit under one.

  On a terminal, `devix` with no arguments now offers its suggested next
  steps as a menu and runs the picked one, so the welcome panel is
  something you can act on rather than only read. Its suggestions also
  carry the exact command to run: the panel used to offer a `docker
doctor` that does not exist, and a test now runs every suggestion and
  fails on an unrecognised command.

- 838abd7: Add an interactive menu engine and deepen the Minecraft workflow.

  `@devix-cli/ui` gains `runMenu`: a keyboard-navigable list with arrow
  keys, Enter to pick, Escape or Ctrl+C to cancel, and typing to filter.
  It buffers its input, because one `data` event can carry several keys and
  treating a chunk as a single key swallows the Enter after a typed filter.
  Off a TTY it degrades to a numbered list, so the same command works in a
  pipe and in CI.

  `devix minecraft` with no operation on a TTY now asks which one to run
  instead of erroring. Two commands join the workflow: `doctor` diagnoses
  an existing project (platform, build wrapper, wrapper jar, Java
  toolchain, catalog version) and `build`/`clean` print the task to run,
  distinct from `run` which launches the game. Every check degrades to a
  warning with a hint rather than throwing, and the Java probe is injected
  from the CLI so the plugin keeps its dependency set and stays testable
  without a JDK.

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

- e78b159: One visual language for every report.

  The home panel drew boxes with the title in the border while every other
  command drew a label with a short rule that dangled like an unfinished
  table, so the CLI read as two programs sharing a name. `status`,
  `doctor`, `detect`, `git`, `config`, `deps`, `plugin`, `web` and
  `minecraft` now use the same section shape as the panel, and a heading
  spans the terminal with its label embedded.

  Long hints wrap instead of ending in an ellipsis inside a box, a missing
  tool reads as "not found" rather than an em dash, and cards no longer
  carry a blank row under their title.

  The truncation ellipsis is now taken from the symbol set: it was
  hardcoded to U+2026 even in ASCII mode, so a legacy console rendered
  mojibake in the exact place the ASCII set exists to prevent it.

### Patch Changes

- e466b3b: Fix the interactive menu so the arrow keys and Enter actually work.

  The menu never put the terminal in raw mode, so keys were buffered until
  Enter and the arrow keys appeared to do nothing — pressing them showed no
  movement, and the selection only registered on the next line. Raw mode is
  now set for the duration and restored on every exit path, including
  cancel.

  An arrow key whose escape sequence arrived in two reads (`ESC` then `[B`)
  was treated as a lone Escape and closed the menu. A lone Escape is now
  given 50ms for the rest of the sequence to arrive before it is read as a
  cancel, which is what a terminal needs and below the delay a keypress
  feels.

  The first frame no longer clears lines it did not draw: it used to erase
  whatever the command had printed above the menu. A CRLF Enter is read as
  one keypress rather than two, and the reader only detaches its own
  listeners instead of every `data` listener on the stream.

- ed96ab2: Every command now opens the way `devix` itself opens.

  The landing panel had a banner — name, one line of purpose, a full-width
  rule — while every other command printed a bare title and jumped straight
  into its sections, so the CLI looked like one styled panel bolted onto a
  set of plain commands. `status`, `doctor`, `detect`, `config`, `deps`,
  `docker`, `git`, `plugin`, `minecraft` and `web` now use the same banner,
  taken from the command's own description, and the same boxed sections
  below it.

  The panel's summary line is a field like every other section, so no
  report mixes prose paragraphs with aligned rows. The banner truncates its
  tagline to one line, because a wrapped tagline would push the rule down
  and break the shape every report shares.

## 0.2.0

### Minor Changes

- b0dfbc8: Rework the entire terminal interface.

  **New `@devix-cli/ui` package** with zero dependencies: capability detection (color level, Unicode support, clamped width), a restrained 256-color theme, and layout components (title, heading, fields, table, panel, list, hint).

  **Every console is supported.** Color follows `FORCE_COLOR`/`NO_COLOR`/`TERM`/`COLORTERM`/TTY. Unicode follows the locale on Unix and the emulator on Windows, where legacy consoles still mangle box drawing. Narrow terminals from 32 to 100 columns are handled: long values truncate, tables shrink their widest column but never below a column's longest token, so identifiers stay readable.

  **All commands migrated** to the new renderer: `status`, `doctor`, `detect`, `git status|branches|diff|sync`, `deps`, `docker`, `minecraft`, `web`, `config` and `plugin list`. Every command now shares the same flags: `--json`, `--cwd`, `--no-color`, `--quiet`, `--verbose`, `--config`.

  > **Breaking change:** human-readable output is now a designed layout instead of ad-hoc `Label: value` lines. Scripts parsing stdout should use `--json`.
