---
"@devix/core": minor
"@devix/cli": minor
---

Adds a minimal plugin API to `@devix/core`: `PluginRegistry` validates `PluginManifest` metadata (id, name, semantic version, description, declared commands) and rejects duplicates. The API is metadata-only and never loads dynamic code. The CLI gains `devix plugin list`, which lists the builtin plugins (docker) through that registry with a `--json` flag.
