---
"devix-cli": minor
"@devix-cli/ui": minor
---

Answer the interactive prompts with the arrow-key menu, and add `--here`.

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
