---
"@devix/doctor": minor
---

Adds the `@devix/doctor` service package: `runDoctor` composes an environment section (Node.js, pnpm, npm, Yarn, Bun, Git with detected versions or `missing` status) and a project section (detected languages, package managers and tools via `@devix/project-detector`). Tool version resolution is injectable via `DoctorServices`, so consumers can test without touching the real system.
