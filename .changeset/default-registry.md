---
"@devix/project-detector": patch
---

Exports every built-in detector from the package entry point and adds `createDefaultRegistry` (plus the `defaultDetectors` list), which bundles node, typescript, java, rust, python, npm, pnpm, yarn, bun, git and docker in a deterministic order.
