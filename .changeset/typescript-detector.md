---
"@devix/project-detector": patch
---

Adds the TypeScript detector via `tsconfig.json`, tolerating JSONC syntax (comments and trailing commas). Extracts `compilerOptions.target` and the typescript version declared in `package.json` as detection details.
