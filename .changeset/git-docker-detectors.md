---
"@devix/project-detector": patch
---

Adds the git and docker detectors. Git is detected via a `.git` directory or file (worktrees and submodules), with the entry kind as detail; Docker via Dockerfile variants, compose files (classic and Compose v2) and `.dockerignore`.
