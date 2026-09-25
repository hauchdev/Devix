---
"@devix/project-detector": patch
---

Adds the npm and pnpm detectors. npm is detected via `package-lock.json`; pnpm via `pnpm-lock.yaml` and/or `pnpm-workspace.yaml`, with the lockfile version extracted as detection detail. Absence is never an error: detectors report `detected: false`.
