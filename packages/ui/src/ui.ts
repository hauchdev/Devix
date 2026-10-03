import type { Capabilities } from "./capabilities.js";
import { detectCapabilities } from "./capabilities.js";
import { Deck } from "./deck.js";
import { Styler, padEndVisible, padStartVisible, truncateVisible, visibleWidth } from "./style.js";
import { symbolsFor, type SymbolSet } from "./symbols.js";
import { createPainter, type Painter } from "./theme.js";

/** Semantic state of a single row, item or check. */
export type Status = "ok" | "warn" | "error" | "info" | "muted";

/** Longest hairline drawn after a heading. */
const RULE_LENGTH = 28;

/** Columns reserved for the status marker in `fields` and `table`. */
const MARKER_WIDTH = 2;

/** A label/value pair. */
export interface Field {
  readonly label: string;
  readonly value?: string;
  readonly status?: Status;
  /** Hints and explanations rendered under the value. */
  readonly hint?: string;
}

/** One row of a table. */
export interface Row {
  readonly cells: readonly string[];
  readonly status?: Status;
}

/** Options accepted by `createUi`. */
export interface UiOptions {
  /** Overrides for capability detection. */
  readonly capabilities?: Partial<Capabilities>;
  /** Explicit color level. */
  readonly color?: Capabilities["color"];
  /** Explicit Unicode support. */
  readonly unicode?: boolean;
  /** Explicit usable width. */
  readonly width?: number;
  /** Where lines are written. Defaults to `process.stdout`. */
  readonly write?: (text: string) => void;
  /** Environment used for detection. Defaults to `process.env`. */
  readonly env?: Record<string, string | undefined>;
  /** Stream used for detection. Defaults to `process.stdout`. */
  readonly stream?: NodeJS.WriteStream;
}

/**
 * The terminal renderer.
 *
 * Every method writes whole lines and returns the renderer, so output can
 * be composed fluently. Nothing here throws: an unusual stream degrades
 * to plain text rather than taking a command down.
 *
 * Layout rules that keep output readable everywhere:
 * - every line is capped at `width` visible columns;
 * - ANSI sequences never count toward that width;
 * - box drawing degrades to ASCII, color degrades to nothing.
 */
export class Ui {
  readonly capabilities: Capabilities;
  readonly style: Styler;
  readonly symbols: SymbolSet;
  /** The theme-bound painter, for themed output. */
  readonly theme: Painter;

  private readonly write: (text: string) => void;
  private cachedDeck: Deck | undefined;

  constructor(options: UiOptions = {}) {
    const stream = options.stream ?? process.stdout;

    const detected = detectCapabilities({
      ...(options.env === undefined ? {} : { env: options.env }),
      isTty: stream.isTTY === true,
      ...(stream.columns === undefined ? {} : { columns: stream.columns }),
    });

    this.capabilities = {
      color: options.color ?? options.capabilities?.color ?? detected.color,
      unicode: options.unicode ?? options.capabilities?.unicode ?? detected.unicode,
      width: options.width ?? options.capabilities?.width ?? detected.width,
      interactive: options.capabilities?.interactive ?? detected.interactive,
    };

    this.style = new Styler(this.capabilities.color);
    this.theme = createPainter(this.capabilities.color);
    this.symbols = symbolsFor(this.capabilities.unicode);
    this.write = options.write ?? ((text: string) => void process.stdout.write(text));
  }

  /**
   * The layout deck: boxes, cards, meters, trees and chips.
   *
   * Built once and reused, because it holds no state beyond a reference
   * to this renderer's sink and symbols.
   */
  get deck(): Deck {
    this.cachedDeck ??= new Deck({
      capabilities: this.capabilities,
      symbols: this.symbols,
      painter: this.theme,
      write: this.write,
      line: (text = "") => this.line(text),
    });
    return this.cachedDeck;
  }

  /** Writes one line followed by a newline. */
  line(text = ""): this {
    this.write(`${text}\n`);
    return this;
  }

  /** Writes an empty line. */
  blank(): this {
    this.write("\n");
    return this;
  }

  /** Writes several lines in order. */
  lines(texts: readonly string[]): this {
    for (const text of texts) {
      this.line(text);
    }
    return this;
  }

  /** The status marker, painted in the status color. */
  marker(status: Status): string {
    switch (status) {
      case "ok":
        return this.style.success(this.symbols.success);
      case "error":
        return this.style.error(this.symbols.error);
      case "warn":
        return this.style.warn(this.symbols.warn);
      case "muted":
      case "info":
        return this.style.muted(this.symbols.info);
    }
  }

  /** Applies the color associated with a status. */
  paint(status: Status, text: string): string {
    switch (status) {
      case "ok":
        return this.style.success(text);
      case "error":
        return this.style.error(text);
      case "warn":
        return this.style.warn(text);
      case "muted":
        return this.style.muted(text);
      case "info":
        return text;
    }
  }

  /**
   * A section heading: bold accent label with an optional count, and a
   * short hairline after it.
   *
   * The rule is deliberately short. A full-width rule frames the output
   * like a table; a short one marks where a section starts and leaves
   * the rest of the line as breathing room.
   */
  heading(label: string, options: { readonly count?: number } = {}): this {
    const suffix = options.count === undefined ? "" : ` ${String(options.count)}`;
    const gap = 2;

    // The label itself must fit: on a narrow terminal a long title is
    // truncated rather than allowed to wrap into the next row.
    const budget = Math.max(1, this.capabilities.width - gap);
    const shown = truncateVisible(label, Math.max(1, budget - suffix.length));
    const styled = `${this.style.bold(this.style.accent(shown))}${this.style.muted(suffix)}`;

    const available = Math.max(
      0,
      this.capabilities.width - visibleWidth(shown) - suffix.length - gap,
    );
    const rule = this.symbols.rule.repeat(Math.min(RULE_LENGTH, available));

    this.line(`${styled}${" ".repeat(gap)}${this.style.muted(rule)}`);
    return this;
  }

  /** A primary title, used once at the top of a report. */
  title(text: string): this {
    this.line(this.style.bold(this.style.accent(text)));
    return this;
  }

  /** A subtle horizontal separator with optional centered text. */
  divider(text?: string): this {
    if (text === undefined || text.length === 0) {
      this.line(this.style.muted(this.symbols.rule.repeat(this.capabilities.width)));
      return this;
    }

    const gap = 2;
    const side = gap + 1;
    const filler = Math.max(0, this.capabilities.width - visibleWidth(text) - side * 2);

    this.line(
      this.style.muted(
        `${this.symbols.rule.repeat(side)}${" "}${text}${" "}${this.symbols.rule.repeat(filler)}`,
      ),
    );
    return this;
  }

  /**
   * Aligned label/value rows.
   *
   * Labels are padded to the widest label so values form a clean column,
   * which is what makes a dense report scannable. A field with no value
   * shows an em dash rather than an empty cell, so "missing" never reads
   * as "unfinished".
   *
   * A marker is drawn only when the row carries a real status. Rows
   * without one are indented into the same column, so the block stays
   * aligned while carrying no decoration that means nothing.
   */
  fields(rows: readonly Field[]): this {
    if (rows.length === 0) {
      return this;
    }

    const labelWidth = Math.min(
      Math.max(...rows.map((row) => visibleWidth(row.label))),
      Math.floor(this.capabilities.width / 2),
    );
    const indent = " ".repeat(MARKER_WIDTH + labelWidth + 2);

    for (const row of rows) {
      const status = row.status ?? "info";
      const label = padEndVisible(this.style.muted(row.label), labelWidth);
      const lead = status === "info" ? " ".repeat(MARKER_WIDTH) : `${this.marker(status)} `;

      const value =
        row.value === undefined || row.value.length === 0
          ? this.style.muted("—")
          : this.paint(
              status,
              truncateVisible(row.value, Math.max(4, this.capabilities.width - indent.length)),
            );

      this.line(`${lead}${label}  ${value}`);

      if (row.hint !== undefined) {
        this.line(`${indent}${this.style.muted(row.hint)}`);
      }
    }

    return this;
  }

  /** A simple bulleted list. */
  list(items: readonly string[], options: { readonly indent?: number } = {}): this {
    const indent = " ".repeat(options.indent ?? 0);
    for (const item of items) {
      this.line(`${indent}${this.style.muted(this.symbols.bullet)} ${item}`);
    }
    return this;
  }

  /**
   * A table sized to its content.
   *
   * Columns are measured, then the widest shrinkable column absorbs any
   * overflow so the table always fits. If even that is not enough, the
   * last column is truncated: a table that stays on one line per row is
   * more useful than one that wraps into noise.
   */
  table(headers: readonly string[], rows: readonly Row[]): this {
    const columnCount = headers.length;
    if (columnCount === 0) {
      return this;
    }

    const gap = 2;
    const widths: number[] = headers.map((header) => visibleWidth(header));

    for (const row of rows) {
      row.cells.forEach((cell, index) => {
        if (index < columnCount) {
          widths[index] = Math.max(widths[index] ?? 0, visibleWidth(cell));
        }
      });
    }

    const total = (): number =>
      widths.reduce((sum, width) => sum + width, 0) + gap * (columnCount - 1);

    // The marker column is part of every line, so it comes out of the
    // budget before any column is sized.
    const budget = Math.max(4, this.capabilities.width - MARKER_WIDTH);

    /**
     * A column may never shrink below its longest single word. Prose
     * columns can therefore compress, but an identifier column (whose
     * value is one unbroken token) keeps its full width, because a
     * truncated id is worse than no table at all.
     */
    const floorFor = (index: number): number => {
      const header = headers[index] ?? "";
      let longest = visibleWidth(header);
      for (const row of rows) {
        for (const word of (row.cells[index] ?? "").split(/\s+/)) {
          longest = Math.max(longest, visibleWidth(word));
        }
      }
      return Math.min(longest, Math.floor(budget / columnCount));
    };

    // Shrink the widest shrinkable column first: the final column is
    // the one most likely to hold prose worth truncating.
    let overflow = total() - budget;
    while (overflow > 0 && columnCount > 1) {
      const lastIndex = columnCount - 2;
      let widest = -1;
      for (let index = 0; index <= lastIndex; index++) {
        if ((widths[index] ?? 0) <= (floorFor(index) ?? 0)) {
          continue;
        }
        if (widest === -1 || (widths[index] ?? 0) > (widths[widest] ?? 0)) {
          widest = index;
        }
      }

      if (widest === -1) {
        break;
      }

      const current = widths[widest] ?? 0;
      const floor = floorFor(widest);
      const shrink = Math.min(overflow, current - floor);
      widths[widest] = current - shrink;
      overflow -= shrink;
    }

    // Anything still over budget comes off the last column, which is
    // truncated at the width it has left.
    const finalIndex = columnCount - 1;
    if (overflow > 0) {
      widths[finalIndex] = Math.max(4, (widths[finalIndex] ?? 4) - overflow);
    }

    const header = headers
      .map((text, index) => padEndVisible(this.style.muted(text), widths[index] ?? 0))
      .join(" ".repeat(gap))
      .trimEnd();
    this.line(`${" ".repeat(MARKER_WIDTH)}${header}`);

    this.line(
      `${" ".repeat(MARKER_WIDTH)}${this.style.muted(
        widths.map((width) => this.symbols.rule.repeat(Math.max(1, width))).join(" ".repeat(gap)),
      )}`,
    );

    for (const row of rows) {
      const status = row.status;
      const cells = row.cells.map((cell, index) => {
        const width = widths[index] ?? visibleWidth(cell);
        return padEndVisible(truncateVisible(cell, width), width);
      });

      const text = truncateVisible(
        cells.join(" ".repeat(gap)).trimEnd(),
        Math.max(4, this.capabilities.width - MARKER_WIDTH),
      );

      // The marker column is always reserved, so rows with and without a
      // status stay in the same column instead of stepping sideways.
      this.line(
        status === undefined
          ? `${" ".repeat(MARKER_WIDTH)}${text}`
          : `${this.marker(status)} ${text}`,
      );
    }

    return this;
  }

  /**
   * A bordered box. Used sparingly: for the one thing a report is really
   * about, not around every section.
   */
  panel(title: string, body: readonly string[], options: { readonly status?: Status } = {}): this {
    const status = options.status ?? "muted";

    const content = [title, ...body];
    const inner = Math.min(
      Math.max(...content.map((line) => visibleWidth(line)), 8),
      Math.max(8, this.capabilities.width - 4),
    );
    const total = inner + 4;

    const border = (text: string): string => this.paint(status, text);

    this.line(
      border(
        `${this.symbols.topLeft}${this.symbols.rule.repeat(total - 2)}${this.symbols.topRight}`,
      ),
    );
    this.line(
      `${border(this.symbols.bar)} ${padEndVisible(this.style.bold(title), inner)} ${border(this.symbols.bar)}`,
    );

    if (body.length > 0) {
      this.line(border(`${this.symbols.bar}${" ".repeat(total - 2)}${this.symbols.bar}`));
    }

    for (const raw of body) {
      const text = truncateVisible(raw, inner);
      this.line(
        `${border(this.symbols.bar)} ${padEndVisible(text, inner)} ${border(this.symbols.bar)}`,
      );
    }

    this.line(
      border(
        `${this.symbols.bottomLeft}${this.symbols.rule.repeat(total - 2)}${this.symbols.bottomRight}`,
      ),
    );
    return this;
  }

  /** A hint or next step, prefixed with an arrow. */
  hint(text: string): this {
    this.line(`${this.style.muted(this.symbols.arrow)} ${this.style.muted(text)}`);
    return this;
  }

  /** An indented block of secondary text. */
  note(text: string): this {
    this.line(`  ${this.style.muted(text)}`);
    return this;
  }

  /** A right-aligned footnote, such as a version or a count. */
  footnote(text: string): this {
    const gap = 1;
    const padding = Math.max(0, this.capabilities.width - visibleWidth(text) - gap);
    this.line(`${" ".repeat(padding)}${this.style.muted(text)}`);
    return this;
  }

  /** Centers a short line, used sparingly for banners. */
  centered(text: string): this {
    const padding = Math.floor(Math.max(0, this.capabilities.width - visibleWidth(text)) / 2);
    this.line(`${" ".repeat(padding)}${text}`);
    return this;
  }

  /** Right-aligns a styled value inside a fixed column. */
  right(value: string, width: number): string {
    return padStartVisible(value, width);
  }
}

/** Creates a renderer with the given options. */
export function createUi(options: UiOptions = {}): Ui {
  return new Ui(options);
}
