# @devix-cli/ui

Terminal rendering primitives for Devix: capability detection, theme and layout components.

## Why

A CLI that looks good on one machine and breaks on another is a bug, not a preference. This package makes that decision explicit and testable:

- **Color** is resolved from `FORCE_COLOR`, `NO_COLOR`, `TERM`, `COLORTERM` and whether the stream is a TTY.
- **Unicode** is resolved from the locale, and from the emulator on Windows, where legacy consoles still mangle box drawing.
- **Width** is clamped so a report stays scannable from 32 to 100 columns.

## API

```ts
import { createUi } from "@devix-cli/ui";

const ui = createUi();

ui.title("Devix");
ui.blank();
ui.heading("Environment", { count: 6 });
ui.fields([
  { label: "Node.js", value: "22.20.4", status: "ok" },
  { label: "Docker", status: "warn", hint: "CLI installed, daemon not running" },
]);
ui.blank();
ui.hint("run devix doctor for the full report");
```

## Layout rules

- Every line is capped at the detected width; long values are truncated with an ellipsis.
- Tables size columns to their content, then shrink the widest shrinkable column so the table always fits.
- ANSI sequences never count toward width.

## Guarantees

- **Zero dependencies.** Devix needs a handful of escape codes, not a styling library.
- **Never throws.** An unusual stream degrades to plain text.
- **Strict TypeScript, ESM only**, Node.js 22+.

## Part of Devix

- [Architecture](https://github.com/hauchdev/Devix/blob/main/docs/architecture.md)
- [Security policy](https://github.com/hauchdev/Devix/blob/main/SECURITY.md)

[MIT](https://github.com/hauchdev/Devix/blob/main/LICENSE) © hauchdev
