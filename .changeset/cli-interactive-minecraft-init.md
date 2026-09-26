---
"devix-cli": minor
---

`devix minecraft init` is now interactive on a terminal: when the platform or name is left out, it shows a numbered platform list and asks for a project name, re-prompting on invalid answers. Scripts are unaffected — pass both arguments as before, since non-interactive input and `--json` runs still require them explicitly (piped stdin is rejected with the usage message instead of hanging, because oclif leaks it into the first positional argument).
