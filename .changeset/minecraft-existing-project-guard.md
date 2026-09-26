---
"@devix-cli/minecraft": minor
---

Scaffolding now refuses destinations that already look like a Minecraft project (any platform detector matched) with `EINVALID_INPUT`, instead of half-filling an existing mod/plugin with a second one. Pass `allowExistingProject: true` to continue; dry-runs always proceed and note the detection. The scaffold result also carries `targetPlatforms`, the platforms the destination had before writing.
