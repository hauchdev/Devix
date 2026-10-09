---
"devix-cli": minor
"@devix-cli/minecraft": minor
---

Add an interactive menu engine and rework the Minecraft workflow.

The CLI gains a `menu` primitive: a navigable list of options with
keyboard support (arrows, enter, number keys), a multi-select mode, and
a search filter. It degrades to plain numbered lists when stdout is not
a TTY, so piped input still works.

Minecraft gets a `doctor` command for existing projects (checks the
wrapper, the Java toolchain and the dependency catalog), a `build`
command that runs the right Gradle/Maven task, and a `clean` command.
The scaffold output now shows a next-steps panel instead of a flat
hint.
