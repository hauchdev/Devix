# @devix-cli/shell

> Safe, controlled external process execution for Devix: argv arrays only, PATH resolution, output limits, timeouts and abort support.

Part of [Devix](https://github.com/hauchdev/Devix) — a modular developer toolkit. This is the only package in the monorepo allowed to spawn processes; everything else builds on it.

## Install

```bash
npm install @devix-cli/shell
```

## Example

```ts
import { commandExists, runCommand, which, ShellError } from "@devix-cli/shell";

// Resolve an executable through PATH (never through the CWD)
const git = await which("git"); // absolute path, or undefined

// Check existence without spawning anything
if (await commandExists("docker")) {
  // Non-zero exit is a result, not an exception
  const result = await runCommand("docker", ["ps", "--format", "{{.Names}}"], {
    cwd: "/some/dir",
    timeoutMs: 30_000,
    maxOutputBytes: 1024 * 1024,
  });
  console.log(result.exitCode, result.stdout);
}

try {
  await runCommand("definitely-missing", []);
} catch (error) {
  if (error instanceof ShellError && error.code === "ENOENT") {
    console.error(`not installed: ${error.command}`);
  }
}
```

## API

| Export                                                   | Description                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `runCommand(command, args, options?)`                    | Spawn a process and collect stdout/stderr/exit code                           |
| `which(command)`                                         | Absolute path resolution through PATH, or `undefined`                         |
| `commandExists(command)`                                 | Existence check without spawning                                              |
| `isCmdShim`, `hasCmdMetacharacters`, `assertSafeCmdArgs` | Windows `.cmd`/`.bat` shim helpers (used internally by `runCommand`)          |
| `ShellError`                                             | Typed error for exceptional failures                                          |
| `RunCommandOptions`                                      | `cwd`, `env`, `timeoutMs`, `signal`, `maxOutputBytes`, `extraPathDirectories` |
| `CommandResult`                                          | `exitCode`, `signal`, `stdout`, `stderr`, `executable`, `viaCmdShim`          |

`ShellError` codes: `ENOENT`, `ESPAWN`, `ETIMEDOUT`, `EABORTED`, `ELIMIT`, `EUNSAFE_ARG`, `EINVALID`.

## Guarantees

- **No shell injection.** Commands are always argv arrays — never `shell: true` with external input. On Windows, `.cmd`/`.bat` shims go through `cmd.exe /d /s /c` only after rejecting every argument containing cmd metacharacters (`EUNSAFE_ARG`).
- **No CWD hijacking.** PATH resolution never resolves through the current directory.
- **Bounded by default.** Output is capped at 10 MiB per stream (`ELIMIT`); timeouts and `AbortSignal` are always available.
- **Windows first-class.** Console windows are hidden, shims are handled safely, and the whole suite runs on Windows CI.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
