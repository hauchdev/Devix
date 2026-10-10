---
"devix-cli": minor
"@devix-cli/ui": minor
---

One visual language for every report.

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
