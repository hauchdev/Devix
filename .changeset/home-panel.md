---
"devix-cli": minor
"@devix-cli/ui": minor
---

Make a bare `devix` an introduction instead of a command reference.

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
