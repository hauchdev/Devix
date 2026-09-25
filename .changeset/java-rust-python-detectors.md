---
"@devix/project-detector": patch
---

Adds the java, rust and python detectors. Java via Maven (`pom.xml`) and Gradle (`build.gradle` variants, settings files, wrapper) with artifactId/rootProject.name details; Rust via `Cargo.toml`/`Cargo.lock` with package name and edition details; Python via `pyproject.toml`, `requirements*.txt`, `setup.py`/`setup.cfg`, `Pipfile`, `poetry.lock` and `uv.lock` with the `[project]` name as detail.
