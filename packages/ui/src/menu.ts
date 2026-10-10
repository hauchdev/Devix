import type { Capabilities } from "./capabilities.js";

/**
 * An interactive, keyboard-navigable menu.
 *
 * The menu is the centre piece of Devix's terminal experience: it turns
 * a flat list of options into something the user can drive with the
 * arrow keys, search through with a filter, and pick without counting
 * rows.
 *
 * It degrades deliberately. When stdout is not a TTY the menu renders
 * as a plain numbered list and reads a line, because there is no cursor
 * to move and no key to capture. That is what makes the same command
 * work in a terminal, in a pipe and in CI.
 */

/** One row of a menu. */
export interface MenuItem {
  /** Value returned when the item is picked. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** One-line description shown next to the name. */
  readonly description?: string;
  /** True when the item starts selected (multi-select only). */
  readonly selected?: boolean;
}

/** What the menu returns. */
export interface MenuResult {
  /** The picked item ids. Always one entry unless multi-select. */
  readonly selected: readonly string[];
  /** True when the user cancelled (Escape or Ctrl+C). */
  readonly cancelled: boolean;
}

/** Options for a single menu run. */
export interface MenuOptions {
  /** The prompt shown above the list. */
  readonly prompt: string;
  /** The items to choose from. */
  readonly items: readonly MenuItem[];
  /** True to allow picking several items. */
  readonly multi?: boolean;
  /** Where to write output. */
  readonly output?: NodeJS.WriteStream;
  /** Where to read keys from. */
  readonly input?: NodeJS.ReadStream;
  /** Override the detected width. */
  readonly width?: number;
}

/** A decoded key press. */
interface KeyEvent {
  readonly name: "enter" | "up" | "down" | "backspace" | "toggle" | "cancel" | "char";
  /** The character, when the key is a printable one. */
  readonly char?: string;
}

const ESC = "\u001b";
const ENTER = "\r";
const NEWLINE = "\n";
const ARROW_UP = `${ESC}[A`;
const ARROW_DOWN = `${ESC}[B`;
const BACKSPACE = "\u007f";
const TAB = "\t";
const CTRL_C = "\u0003";

/** Erases the current line and moves the cursor up one row. */
const CLEAR_LINE = `${ESC}[1A${ESC}[2K`;

/** How many rows of the list are drawn before it is windowed. */
const MAX_ROWS = 12;

/**
 * A buffered key reader.
 *
 * A single `data` event can carry several keys — a paste, a fast typist,
 * or several writes that arrive together — so the reader keeps the
 * remainder buffered and hands back one key per call. Treating a whole
 * chunk as one key would swallow the Enter that follows a typed filter.
 */
class KeyReader {
  private buffer = "";
  private waiting:
    | { resolve: (key: KeyEvent) => void; reject: (error: unknown) => void }
    | undefined;

  constructor(private readonly stream: NodeJS.ReadStream) {
    stream.on("data", (chunk: Buffer | string) => {
      this.buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      this.drain();
    });
    stream.on("error", (error: Error) => {
      const waiter = this.waiting;
      this.waiting = undefined;
      waiter?.reject(error);
    });
  }

  /** Resolves the pending read as soon as a complete key is buffered. */
  private drain(): void {
    if (this.waiting === undefined || this.buffer.length === 0) {
      return;
    }
    const decoded = this.take();
    if (decoded === undefined) {
      return;
    }
    const waiter = this.waiting;
    this.waiting = undefined;
    waiter.resolve(decoded);
  }

  /**
   * Removes and returns one key from the front of the buffer.
   *
   * Returns undefined when the buffer holds only the start of an escape
   * sequence, because more bytes are still on the way.
   */
  private take(): KeyEvent | undefined {
    if (this.buffer.startsWith(ARROW_UP)) {
      this.buffer = this.buffer.slice(ARROW_UP.length);
      return { name: "up" };
    }
    if (this.buffer.startsWith(ARROW_DOWN)) {
      this.buffer = this.buffer.slice(ARROW_DOWN.length);
      return { name: "down" };
    }

    const first = this.buffer[0] ?? "";
    if (first === ENTER || first === NEWLINE) {
      this.buffer = this.buffer.slice(1);
      return { name: "enter" };
    }
    if (first === BACKSPACE || first === "\b") {
      this.buffer = this.buffer.slice(1);
      return { name: "backspace" };
    }
    if (first === TAB) {
      this.buffer = this.buffer.slice(1);
      return { name: "toggle" };
    }
    if (first === CTRL_C) {
      this.buffer = this.buffer.slice(1);
      return { name: "cancel" };
    }
    if (first === ESC) {
      // A bare Escape: if an arrow sequence were coming it would already
      // be in the buffer, so anything else cancels.
      this.buffer = this.buffer.slice(1);
      return { name: "cancel" };
    }

    this.buffer = this.buffer.slice(1);
    return { name: "char", char: first };
  }

  /** Waits for the next key. */
  next(): Promise<KeyEvent> {
    if (this.buffer.length > 0) {
      const decoded = this.take();
      if (decoded !== undefined) {
        return Promise.resolve(decoded);
      }
    }
    return new Promise((resolve, reject) => {
      this.waiting = { resolve, reject };
    });
  }
}

/** Runs one interactive menu and returns the picked ids. */
export async function runMenu(options: MenuOptions): Promise<MenuResult> {
  const output = options.output ?? process.stdout;
  const input = options.input ?? process.stdin;

  // Not a TTY: there is no cursor to move, so the menu falls back to
  // the numbered list the non-interactive prompts already use.
  if (output.isTTY !== true) {
    return runNumberedList(options, output, input);
  }

  const width = options.width ?? output.columns ?? 80;
  const capabilities: Capabilities = { color: "none", unicode: true, width, interactive: true };
  void capabilities;

  const multi = options.multi === true;
  const state = {
    cursor: 0,
    query: "",
    // Seeded from the items so a caller can pre-select defaults.
    selected: new Set(
      options.items.filter((item) => item.selected === true).map((item) => item.id),
    ),
  };

  const visible = (): readonly MenuItem[] =>
    state.query.length === 0
      ? options.items
      : options.items.filter((item) => item.name.toLowerCase().includes(state.query.toLowerCase()));

  const draw = (): void => {
    const items = visible();
    const rows = Math.min(items.length, MAX_ROWS);

    for (let index = 0; index < rows + 2; index += 1) {
      output.write(CLEAR_LINE);
    }

    output.write(`? ${options.prompt}\n`);
    const hint = multi ? "  (space to toggle, enter to confirm)" : "";
    output.write(
      `  ${String(items.length)} option(s)${state.query.length > 0 ? `, filtered by "${state.query}"` : ""}${hint}\n`,
    );

    for (let index = 0; index < rows; index += 1) {
      const item = items[index];
      if (item === undefined) {
        continue;
      }
      const cursor = index === state.cursor ? ">" : " ";
      const box = multi ? (state.selected.has(item.id) ? "[x] " : "[ ] ") : "";
      const desc = item.description === undefined ? "" : `  ${item.description}`;
      output.write(`${`${cursor} ${box}${item.name}${desc}`.slice(0, width)}\n`);
    }
  };

  draw();

  const reader = new KeyReader(input);

  for (;;) {
    const key = await reader.next();

    const items = visible();

    if (key.name === "enter") {
      if (multi) {
        // A filter can hide a selected row; keep every selection, not
        // just the visible ones, so confirming after a filter is safe.
        output.write(CLEAR_LINE);
        return { selected: [...state.selected], cancelled: false };
      }
      const picked = items[state.cursor];
      if (picked !== undefined) {
        output.write(CLEAR_LINE);
        return { selected: [picked.id], cancelled: false };
      }
      continue;
    }

    if (key.name === "cancel") {
      output.write(CLEAR_LINE);
      return { selected: [], cancelled: true };
    }

    if (key.name === "up" && state.cursor > 0) {
      state.cursor -= 1;
      draw();
      continue;
    }

    if (key.name === "down" && state.cursor < items.length - 1) {
      state.cursor += 1;
      draw();
      continue;
    }

    if (key.name === "backspace") {
      state.query = state.query.slice(0, -1);
      state.cursor = 0;
      draw();
      continue;
    }

    // Space and Tab toggle in multi mode; in single mode space is an
    // ordinary character, because a single-select menu has no use for a
    // toggle key.
    if (multi && (key.name === "toggle" || key.char === " ")) {
      const item = items[state.cursor];
      if (item !== undefined) {
        if (state.selected.has(item.id)) {
          state.selected.delete(item.id);
        } else {
          state.selected.add(item.id);
        }
        draw();
      }
      continue;
    }

    if (key.name === "char" && key.char !== undefined) {
      state.query += key.char;
      state.cursor = 0;
      draw();
    }
  }

  return { selected: [], cancelled: false };
}

/** Numbered fallback: the same options as a plain list. */
async function runNumberedList(
  options: MenuOptions,
  output: NodeJS.WriteStream,
  input: NodeJS.ReadStream,
): Promise<MenuResult> {
  const multi = options.multi === true;

  output.write(`? ${options.prompt}\n`);
  options.items.forEach((item, index) => {
    const box = multi ? (item.selected === true ? "[x] " : "[ ] ") : "";
    const desc = item.description === undefined ? "" : `  ${item.description}`;
    output.write(`  ${String(index + 1)}) ${box}${item.name}${desc}\n`);
  });

  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input, output });
  try {
    const prompt = multi ? "  Pick numbers, comma separated: " : "  Pick a number: ";
    const answer = await rl.question(prompt);

    if (!multi) {
      const item = options.items[Number.parseInt(answer.trim(), 10) - 1];
      return item === undefined
        ? { selected: [], cancelled: false }
        : { selected: [item.id], cancelled: false };
    }

    // An empty answer keeps the pre-selected defaults, which is what a
    // caller passing `selected` items means by them.
    if (answer.trim().length === 0) {
      return {
        selected: options.items.filter((item) => item.selected === true).map((item) => item.id),
        cancelled: false,
      };
    }

    const selected = answer
      .split(/[,\s]+/)
      .map((token) => options.items[Number.parseInt(token, 10) - 1])
      .filter((item): item is MenuItem => item !== undefined)
      .map((item) => item.id);

    return { selected: [...new Set(selected)], cancelled: false };
  } finally {
    rl.close();
  }
}
