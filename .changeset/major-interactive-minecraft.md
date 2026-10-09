---
"devix-cli": minor
"@devix-cli/minecraft": minor
"@devix-cli/ui": minor
---

Add an interactive menu engine and deepen the Minecraft workflow.

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
