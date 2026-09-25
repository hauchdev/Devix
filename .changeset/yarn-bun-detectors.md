---
"@devix/project-detector": patch
---

Adds the yarn and bun detectors. Yarn is detected via `yarn.lock` and/or `.yarnrc.yml`, with the lockfile version from the header comment as detail; Bun via `bun.lockb`, `bun.lock` and/or `bunfig.toml`.
