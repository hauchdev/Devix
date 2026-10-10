import type { Capabilities } from "./capabilities.js";

/**
 * An interactive, keyboard-navigable menu.
 *
 * The menu is the centre piece of Devix's terminal experience: it turns
 * a flat list of options into something the user can drive with the
 * arrow keys, search through with a filter, and pick without counting
 * rows.
 *
 * It degrades deliberately. When either stream is not a TTY the menu
 * renders as a plain numbered list and reads a line, because there is no
 * cursor to move and no key to capture. That is what makes the same
 * command work in a terminal, in a pipe and in CI.
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
 * How long to wait for the rest of an escape sequence.
 *
 * A terminal may send `ESC` and `[B` in separate reads, so a lone
 * `ESC` is ambiguous: it is either the user pressing Escape or the start
 * of an arrow key. Waiting this long before calling it a cancel is what
 * stops the arrow keys from closing the menu. 50ms is below the
 * threshold where a keypress feels delayed.
 */
const ESCAPE_TIMEOUT_MS = 50;

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
  private timer: NodeJS.Timeout | undefined;
  private readonly onData: (chunk: Buffer | string) => void;
  private readonly onError: (error: Error) => void;

  constructor(private readonly stream: NodeJS.ReadStream) {
    this.onData = (chunk) => {
      this.buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      this.drain();
    };
    this.onError = (error) => {
      const waiter = this.waiting;
      this.waiting = undefined;
      this.clearTimer();
      waiter?.reject(error);
    };
    stream.on("data", this.onData);
    stream.on("error", this.onError);
  }

  /** Resolves the pending read as soon as a complete key is buffered. */
  private drain(): void {
    if (this.waiting === undefined) {
      return;
    }

    const decoded = this.take();
    if (decoded !== undefined) {
      const waiter = this.waiting;
      this.waiting = undefined;
      this.clearTimer();
      waiter.resolve(decoded);
      return;
    }

    // The buffer holds a lone Escape: it is either the user pressing
    // Escape or the start of an arrow sequence whose bytes have not
    // arrived yet. Give the terminal a moment to finish before deciding.
    // The timer starts here rather than in `next` because the Escape is
    // what arrives late, after the read is already waiting.
    if (this.buffer.startsWith(ESC) && this.timer === undefined) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        const waiter = this.waiting;
        if (waiter === undefined) {
          return;
        }
        this.waiting = undefined;
        this.buffer = this.buffer.slice(1);
        waiter.resolve({ name: "cancel" });
      }, ESCAPE_TIMEOUT_MS);
      this.timer.unref?.();
    }
  }

  /**
   * Removes and returns one key from the front of the buffer.
   *
   * Returns undefined when the buffer holds only the start of an escape
   * sequence, because more bytes may still be on the way.
   */
  private take(): KeyEvent | undefined {
    if (this.buffer.length === 0) {
      return undefined;
    }

    if (this.buffer.startsWith(ARROW_UP)) {
      this.buffer = this.buffer.slice(ARROW_UP.length);
      return { name: "up" };
    }
    if (this.buffer.startsWith(ARROW_DOWN)) {
      this.buffer = this.buffer.slice(ARROW_DOWN.length);
      return { name: "down" };
    }

    const first = this.buffer[0] ?? "";

    if (first === ESC) {
      // A lone Escape is ambiguous; `drain` resolves it with a timer.
      // Anything longer that did not match an arrow is a real Escape with
      // the next key already buffered.
      if (this.buffer.length === 1) {
        return undefined;
      }
      this.buffer = this.buffer.slice(1);
      return { name: "cancel" };
    }

    // A terminal may send CRLF for Enter; consuming both stops the menu
    // from seeing two Enters for one keypress.
    if (first === ENTER) {
      this.buffer = this.buffer.startsWith(`${ENTER}${NEWLINE}`)
        ? this.buffer.slice(2)
        : this.buffer.slice(1);
      return { name: "enter" };
    }
    if (first === NEWLINE) {
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

    this.buffer = this.buffer.slice(1);
    return { name: "char", char: first };
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /** Waits for the next key. */
  next(): Promise<KeyEvent> {
    return new Promise((resolve, reject) => {
      this.waiting = { resolve, reject };
      this.drain();
    });
  }

  /** Releases any pending timer and this reader's listeners. */
  close(): void {
    this.clearTimer();
    this.stream.off("data", this.onData);
    this.stream.off("error", this.onError);
  }
}

/** Runs one interactive menu and returns the picked ids. */
export async function runMenu(options: MenuOptions): Promise<MenuResult> {
  const output = options.output ?? process.stdout;
  const input = options.input ?? process.stdin;

  // Both streams must be terminals: a menu that can draw but cannot read
  // keys would just sit there.
  if (output.isTTY !== true || input.isTTY !== true) {
    return runNumberedList(options, output, input);
  }

  const width = options.width ?? output.columns ?? 80;
  const capabilities: Capabilities = { color: "none", unicode: true, width, interactive: true };
  void capabilities;

  // Raw mode is what makes a keypress arrive immediately instead of being
  // buffered until Enter, and what stops the terminal from echoing the
  // arrow-key escape sequences onto the screen. Without it the arrow keys
  // appear to do nothing.
  const canRaw = typeof input.setRawMode === "function";
  const wasRaw = input.isRaw === true;
  if (canRaw) {
    input.setRawMode(true);
  }
  input.resume();

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

  // The region the menu occupies, so it can be erased exactly. The first
  // draw must not clear anything: there is nothing of ours above it yet,
  // and clearing would eat whatever the command printed first.
  let drawnRows = 0;

  const erase = (): void => {
    for (let index = 0; index < drawnRows; index += 1) {
      output.write(CLEAR_LINE);
    }
    drawnRows = 0;
  };

  const draw = (): void => {
    erase();

    const items = visible();
    const rows = Math.min(items.length, MAX_ROWS);
    const hint = multi ? "  (space to toggle, enter to confirm)" : "";
    const filtered = state.query.length > 0 ? `, filtered by "${state.query}"` : "";

    output.write(`? ${options.prompt}\n`);
    output.write(`  ${String(items.length)} option(s)${filtered}${hint}\n`);

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

    drawnRows = rows + 2;
  };

  const reader = new KeyReader(input);

  try {
    draw();

    for (;;) {
      const key = await reader.next();
      const items = visible();

      if (key.name === "enter") {
        if (multi) {
          // A filter can hide a selected row; keep every selection, not
          // just the visible ones, so confirming after a filter is safe.
          erase();
          return { selected: [...state.selected], cancelled: false };
        }
        const picked = items[state.cursor];
        if (picked !== undefined) {
          erase();
          return { selected: [picked.id], cancelled: false };
        }
        continue;
      }

      if (key.name === "cancel") {
        erase();
        return { selected: [], cancelled: true };
      }

      if (key.name === "up") {
        if (state.cursor > 0) {
          state.cursor -= 1;
          draw();
        }
        continue;
      }

      if (key.name === "down") {
        if (state.cursor < items.length - 1) {
          state.cursor += 1;
          draw();
        }
        continue;
      }

      if (key.name === "backspace") {
        if (state.query.length > 0) {
          state.query = state.query.slice(0, -1);
          state.cursor = 0;
          draw();
        }
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
  } finally {
    reader.close();
    if (canRaw) {
      input.setRawMode(wasRaw);
    }
    input.pause();
  }
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
