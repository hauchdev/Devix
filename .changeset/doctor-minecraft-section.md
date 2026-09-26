---
"@devix-cli/doctor": minor
---

The project section of the doctor report now includes `minecraft`: the detected Minecraft platforms as `id` or `id (detail)` entries (e.g. `fabric (mymod)`), empty outside Minecraft projects. `devix doctor` renders a `Minecraft:` line only when platforms are detected.
