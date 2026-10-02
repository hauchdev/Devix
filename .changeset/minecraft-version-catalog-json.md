---
"@devix-cli/minecraft": minor
---

Move the Minecraft version catalog from a hardcoded TypeScript array to `catalog/versions.json`. This allows updating dependency versions without recompiling the plugin. The JSON file is validated at build/test time and included in the published package.
