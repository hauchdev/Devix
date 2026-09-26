---
"@devix-cli/project-detector": minor
---

Adds `detectMinecraftPlatforms(registry, { cwd | root })`: composes every `minecraft`-category detector into a flat answer with one entry per detected platform (id, name, manifest detail, marker evidence), plus `isMinecraft` and the resolved root. Also adds an exact-directory `root` option to `detectProject` (takes precedence over the upward `cwd` search), which `detectMinecraftPlatforms` accepts as well.
