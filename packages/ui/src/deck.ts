import type { Capabilities } from "./capabilities.js";
import { padEndVisible, truncateVisible, visibleWidth } from "./style.js";
import type { SymbolSet } from "./symbols.js";
import { Painter, type Theme } from "./theme.js";

/**
 * Rich-style layout primitives.
 *
 * These are the pieces that make output look *composed* rather than
 * printed: a box with a title sitting in its own top border, a row of
 * cards, a meter, a tree. They are separate from `Ui` because they are
 * about arrangement, not about status, and because a report should be
 * able to use them without the rest of the renderer.
 *
 * Like everything in this package they obey the same two rules: every
 * line fits `capabilities.width`, and nothing throws at render time.
 */

/** One card in a `cards` row. */
export interface Card {
  /** Heading shown at the top of the card. */
  readonly title: string;
  /** The lines of the card body. */
  readonly lines: readonly string[];
  /** Accent role for the title and the top border. */
  readonly accent?: keyof Theme;
}

/** One row of a meter. */
export interface Meter {
  /** What is being counted. */
  readonly label: string;
  /** How many are in the good state. */
  readonly value: number;
  /** How many there are in total. */
  readonly total: number;
  /** Role used to paint the filled part of the bar. */
  readonly role?: keyof Theme;
}

/** One node of a `tree`. */
export interface TreeNode {
  /** The node label. */
  readonly label: string;
  /** Role for the label's colour. */
  readonly role?: keyof Theme;
  /** Children, rendered one level deeper. */
  readonly children?: readonly TreeNode[];
}

/** A keyboard shortcut or flag, rendered as a key cap. */
export interface KeyHint {
  /** The key or flag, without decoration. */
  readonly keys: string;
  /** What it does. */
  readonly description: string;
}

/** Options for a box border. */
export interface BoxOptions {
  /** Role for the border and the title. */
  readonly role?: keyof Theme;
  /** Text shown in the bottom border. */
  readonly footer?: string;
}

export interface DeckOptions {
  readonly capabilities: Capabilities;
  readonly symbols: SymbolSet;
  readonly painter: Painter;
  readonly write: (text: string) => void;
  /** Draws one line. */
  readonly line: (text?: string) => void;
}

const CARD_GAP = 2;

/** Renders Rich-style layout primitives against a fixed width. */
export class Deck {
  private readonly cap: Capabilities;
  private readonly sym: SymbolSet;
  private readonly p: Painter;
  private readonly emit: (text: string) => void;
  private readonly put: (text?: string) => void;

  constructor(options: DeckOptions) {
    this.cap = options.capabilities;
    this.sym = options.symbols;
    this.p = options.painter;
    this.emit = options.write;
    this.put = options.line;
  }

  /**
   * Truncates to a visible width, using this renderer's ellipsis.
   *
   * Routing every cut through here is what keeps the ASCII symbol set
   * printable: a hardcoded \`…\` would render as mojibake on a legacy
   * console.
   */
  private cut(text: string, width: number): string {
    return truncateVisible(text, width, this.sym.ellipsis);
  }

  /** The usable width, with a floor so layout math never goes negative. */
  private get width(): number {
    return Math.max(8, this.cap.width);
  }

  /**
   * A box whose title sits in the top border.
   *
   * This is the signature shape: the title is part of the frame rather
   * than a row inside it, which is what makes a stack of boxes read as
   * a set of cards instead of a wall of text.
   */
  box(title: string, body: readonly string[], options: BoxOptions = {}): this {
    const role = options.role ?? "border";
    const inner = this.width - 4;

    const titleText = this.cut(title, Math.max(1, inner - 4));
    const lead = `${this.sym.topLeft}${this.sym.rule} `;
    const trail = this.sym.rule.repeat(Math.max(0, inner - visibleWidth(titleText) - 1));
    this.put(
      this.p.paint(role, `${lead}${this.p.strong(role, titleText)} `) +
        this.p.paint(role, trail) +
        this.p.paint(role, this.sym.topRight),
    );

    for (const raw of body) {
      const text = this.cut(raw, inner);
      this.put(
        `${this.p.paint(role, this.sym.bar)} ${padEndVisible(text, inner)} ${this.p.paint(role, this.sym.bar)}`,
      );
    }

    const footer = options.footer;
    if (footer === undefined || footer.length === 0) {
      this.put(
        this.p.paint(
          role,
          `${this.sym.bottomLeft}${this.sym.rule.repeat(inner + 2)}${this.sym.bottomRight}`,
        ),
      );
    } else {
      const footerText = this.cut(footer, Math.max(1, inner - 1));
      const fill = Math.max(0, inner - visibleWidth(footerText));
      this.put(
        this.p.paint(
          role,
          `${this.sym.bottomLeft}${this.sym.rule.repeat(fill)} ${this.p.faint("muted", footerText)} `,
        ) + this.p.paint(role, this.sym.bottomRight),
      );
    }

    return this;
  }

  /**
   * A row of cards laid out side by side.
   *
   * Columns share the width equally, because the content of a summary
   * row is short and predictable; unequal columns would look accidental.
   * Below the threshold where each card would be too narrow to hold a
   * word, the cards stack instead, because a 12-column card is noise.
   */
  cards(items: readonly Card[]): this {
    if (items.length === 0) {
      return this;
    }

    const columns = Math.min(items.length, Math.max(1, Math.floor(this.width / 26)));
    if (columns < 2) {
      for (const item of items) {
        this.box(item.title, item.lines, {
          ...(item.accent === undefined ? {} : { role: item.accent }),
        });
        this.put();
      }
      return this;
    }

    // Every card in a row gets the same width, derived from the number
    // of cards that row actually holds. Deriving it once per row — and
    // from the real count rather than the maximum — is what keeps the
    // grid exactly as wide as the terminal.
    const rows = Math.ceil(items.length / columns);
    const perRow = Math.ceil(items.length / rows);

    for (let start = 0; start < items.length; start += perRow) {
      const slice = items.slice(start, start + perRow);
      // A border is two characters and one space of padding per side.
      const cell = Math.max(
        4,
        Math.floor((this.width - CARD_GAP * (slice.length - 1)) / slice.length),
      );
      this.renderCardRow(slice, cell);
      this.put();
    }

    return this;
  }

  /** Draws one row of cards, sized for exactly the cards it holds. */
  private renderCardRow(slice: readonly Card[], cell: number): void {
    const widthFor = (): number => cell;

    // One row per line of the tallest card, plus the bottom border. There
    // is no gap row under the title: the title already sits in the top
    // border, and a blank row there would just push every card taller
    // than its content.
    const bodyRows = Math.max(...slice.map((item) => item.lines.length));

    const top = slice
      .map((item) => {
        const accent = item.accent ?? "border";
        const width = widthFor();
        const head = this.cut(item.title, Math.max(1, width - 4));
        // ╭ + ─ + space + title + space + rule + ╮: five fixed columns
        // around the title, and the rule takes whatever is left.
        const rule = this.sym.rule.repeat(Math.max(0, width - visibleWidth(head) - 5));
        return (
          this.p.paint(accent, `${this.sym.topLeft}${this.sym.rule} `) +
          this.p.strong(accent, head) +
          this.p.paint(accent, ` ${rule}${this.sym.topRight}`)
        );
      })
      .join(" ".repeat(CARD_GAP));
    this.put(top);

    for (let row = 0; row < bodyRows; row += 1) {
      const cells = slice.map((item) => {
        const accent = item.accent ?? "border";
        const width = widthFor();
        const raw = item.lines[row];
        if (raw === undefined) {
          // A card shorter than the tallest one still needs its side
          // rails, or its content looks clipped rather than finished.
          return `${this.p.paint(accent, this.sym.bar)}${" ".repeat(width - 2)}${this.p.paint(accent, this.sym.bar)}`;
        }
        const text = this.cut(raw, Math.max(1, width - 4));
        return `${this.p.paint(accent, this.sym.bar)} ${padEndVisible(text, width - 4)} ${this.p.paint(accent, this.sym.bar)}`;
      });
      this.put(cells.join(" ".repeat(CARD_GAP)).trimEnd());
    }

    const bottom = slice
      .map((item) => {
        const accent = item.accent ?? "border";
        const width = widthFor();
        return this.p.paint(
          accent,
          `${this.sym.bottomLeft}${this.sym.rule.repeat(width - 2)}${this.sym.bottomRight}`,
        );
      })
      .join(" ".repeat(CARD_GAP));
    this.put(bottom);
  }

  /**
   * A proportional bar, like a progress meter.
   *
   * The bar is drawn in eighths so it renders at any width without
   * looking like a row of identical blocks. When the terminal is too
   * narrow for a bar, the numbers alone are shown: a truncated bar is
   * worse than no bar.
   */
  meter(row: Meter): this {
    const role = row.role ?? "success";
    const safeTotal = Math.max(0, row.total);
    const value = Math.min(Math.max(0, row.value), safeTotal);

    const counter = `${String(value)}/${String(safeTotal)}`;
    const cap = Math.floor(this.width / 3);

    // The label must fit before anything else is measured: an
    // over-long label that is only truncated at print time leaves the
    // bar sized against a column that does not exist, which is how a
    // meter ends up wider than the terminal.
    const label = padEndVisible(this.cut(row.label, cap), cap);
    const barRoom = this.width - visibleWidth(label) - visibleWidth(counter) - 4;

    if (barRoom < 6) {
      this.put(`${label}  ${this.p.paint(role, counter)}`);
      return this;
    }

    const eighths = safeTotal === 0 ? 0 : Math.round((value / safeTotal) * barRoom * 8);
    const full = Math.floor(eighths / 8);
    const partial = eighths % 8;
    const partialChar = PARTIALS[partial] ?? this.sym.blockEmpty;

    const filled = this.sym.blockFull.repeat(full) + (partial > 0 ? partialChar : "");
    const emptyCount = Math.max(0, barRoom - visibleWidth(filled));
    const bar =
      this.p.paint(role, filled) + this.p.faint("border", this.sym.blockEmpty.repeat(emptyCount));

    this.put(`${label}  ${bar}  ${this.p.paint(role, counter)}`);
    return this;
  }

  /**
   * A tree, drawn with real box-drawing connectors.
   *
   * The last child of a level uses an elbow and everything above it a
   * tee, which is what makes the shape readable without counting spaces.
   */
  tree(nodes: readonly TreeNode[], options: { readonly indent?: number } = {}): this {
    const base = options.indent ?? 0;
    const draw = (items: readonly TreeNode[], prefix: string, depth: number): void => {
      items.forEach((item, index) => {
        const last = index === items.length - 1;
        const role = item.role ?? "muted";
        const connector =
          depth === 0
            ? ""
            : last
              ? `${this.sym.elbow}${this.sym.rule} `
              : `${this.sym.tee}${this.sym.rule} `;
        const lead = depth === 0 ? this.sym.bullet : connector;
        const text = this.cut(item.label, Math.max(1, this.width - base - prefix.length - 2));
        this.put(
          `${" ".repeat(base + prefix.length)}${this.p.paint(role, lead)} ${this.p.paint(role, text)}`,
        );

        const children = item.children ?? [];
        if (children.length > 0) {
          draw(
            children,
            `${prefix}${depth === 0 ? " " : last ? "  " : `${this.sym.pipe} `}`,
            depth + 1,
          );
        }
      });
    };

    draw(nodes, "", 0);
    return this;
  }

  /**
   * A list of key caps with their descriptions.
   *
   * Caps are padded to a common width so the descriptions line up, which
   * is the whole point: a list of shortcuts is a table wearing a hat.
   */
  keys(hints: readonly KeyHint[]): this {
    if (hints.length === 0) {
      return this;
    }

    const caps = hints.map((hint) => `${this.sym.keyLeft}${hint.keys}${this.sym.keyRight}`);
    const capWidth = Math.max(...caps.map(visibleWidth));
    const budget = Math.max(1, this.width - capWidth - 2);

    for (const hint of hints) {
      const cap = padEndVisible(
        this.p.paint("secondary", `${this.sym.keyLeft}${hint.keys}${this.sym.keyRight}`),
        capWidth,
      );
      this.put(`${cap}  ${this.cut(hint.description, budget)}`);
    }

    return this;
  }

  /** A row of inline chips, wrapped so nothing exceeds the width. */
  chips(items: readonly { readonly text: string; readonly role?: keyof Theme }[]): this {
    if (items.length === 0) {
      return this;
    }

    let current: string[] = [];
    let used = 0;

    const flush = (): void => {
      if (current.length > 0) {
        this.put(current.join("  "));
        current = [];
        used = 0;
      }
    };

    for (const item of items) {
      const chip = ` ${item.text} `;
      const cost = visibleWidth(chip) + (current.length === 0 ? 0 : 2);
      if (used + cost > this.width && current.length > 0) {
        flush();
        current.push(chip);
        used = visibleWidth(chip);
      } else {
        current.push(chip);
        used += cost;
      }
    }
    flush();

    return this;
  }

  /**
   * A brand banner: a name, a tagline and a rule under them.
   *
   * This is the one place the CLI uses its loudest styling, because it
   * is the first thing a user sees — and the header every command opens
   * with, so a report starts the same way wherever it comes from.
   */
  banner(name: string, tagline: string, version?: string): this {
    this.put(
      `${this.p.strong("primary", name)}${version === undefined ? "" : this.p.faint("muted", ` ${version}`)}`,
    );
    // The tagline is one line by contract: a wrapped tagline would push
    // the rule down and break the shape every report shares.
    this.put(this.p.faint("muted", this.cut(tagline, this.width)));
    this.put(this.p.paint("border", this.sym.rule.repeat(this.width)));
    return this;
  }
}

/**
 * Partial block glyphs, so a bar can express eighths of a cell.
 *
 * Indexed by how full the last cell is: 0 means empty, 8 is a full
 * block. Written as escapes rather than literals because these are the
 * one glyph run in this file that a toolchain can silently mangle.
 */
const PARTIALS: readonly string[] = [
  "",
  "\u258F",
  "\u258E",
  "\u258D",
  "\u258C",
  "\u258B",
  "\u258A",
  "\u2589",
];

/** Creates a deck bound to a renderer. */
export function createDeck(options: DeckOptions): Deck {
  return new Deck(options);
}
