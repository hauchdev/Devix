# @devix-cli/output

Canonical output primitives and exit codes for Devix commands.

## API

```ts
import { ok, err, formatJson, ExitCode } from "@devix-cli/output";

const success = ok({ files: ["a.ts", "b.ts"] });
console.log(formatJson(success));
// { "ok": true, "data": { "files": ["a.ts", "b.ts"] } }

const failure = err("EINVALID", "Missing required flag.");
console.log(formatJson(failure));
// { "ok": false, "error": { "code": "EINVALID", "message": "Missing required flag." } }
```

## Exit codes

| Code | Value | Meaning                                |
| ---- | ----- | -------------------------------------- |
| `Success`    | 0 | Command completed as expected.         |
| `Failure`    | 1 | User-facing failure (input, tooling).  |
| `Unexpected` | 2 | Internal/programming error.            |

## Guarantees

- **Zero external dependencies** beyond `@devix-cli/core`.
- **Strict TypeScript, ESM only**, Node.js 22+.
