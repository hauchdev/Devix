---
"@devix-cli/docker": minor
"@devix-cli/minecraft": minor
"devix-cli": patch
---

Docker and Minecraft manifests now declare `capabilities.commands` with `apiVersion: "1"`. `devix plugin list` merges capability commands with the legacy top-level `commands` array.
