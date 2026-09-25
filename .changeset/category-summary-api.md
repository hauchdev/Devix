---
"@devix/project-detector": patch
---

Adds a `category` field to every detector (language, packageManager, tool) and a new `summarizeProject` API that composes a project detection into grouped `languages`, `packageManagers` and `tools` lists, closing the phase 2 final API. `defaultDetectors` and the summary types are now exported from the package entry point.
