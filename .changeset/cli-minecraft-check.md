---
"devix-cli": minor
---

Adds `devix minecraft check [platform]`: detects existing Minecraft mod/plugin projects from the directory tree, listing every platform found with its manifest detail (or `isMinecraft: false` outside Minecraft projects). With a platform id it also reports whether that specific platform matched. `devix doctor` now shows a `Minecraft:` section when platforms are detected.
