import { describe, expect, it } from "vitest";

import { createUi, symbolsFor, visibleWidth } from "../src/index.js";

/** The ASCII escape introducer. */
const ESC = String.fromCharCode(27);

/**
 * Matches ANSI SGR sequences so assertions can compare against plain
 * text.
 *
 * Built with the RegExp constructor so the pattern holds no control
 * character, which keeps `no-control-regex` satisfied without a
 * suppression comment.
 */
const ANSI_PATTERN = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

/** Renders a deck into a buffer and returns plain lines. */
function render(
  draw: (ui: ReturnType<typeof createUi>) => void,
  options: Parameters<typeof createUi>[0] = {},
): string[] {
  const chunks: string[] = [];
  const ui = createUi({
    color: "none",
    unicode: true,
    width: 80,
    ...options,
    write: (text) => chunks.push(text),
  });
  draw(ui);
  return chunks
    .join("")
    .split("\n")
    .slice(0, -1)
    .map((line) => line.replace(ANSI_PATTERN, ""));
}

describe("deck.box", () => {
  it("puts the title inside the top border", () => {
    const lines = render((ui) => ui.deck.box("Environment", ["6 tools"]));

    // The title is part of the frame, not a row inside it.
    const top = lines[0] ?? "";
    expect(top.startsWith("\u256D\u2500 Environment \u2500")).toBe(true);
    expect(top.endsWith("\u256E")).toBe(true);
    expect(visibleWidth(top)).toBe(80);

    expect(lines[1]).toContain("6 tools");
    expect(lines[1]?.startsWith("\u2502 ")).toBe(true);
    expect(lines[2]).toBe("\u2570" + "\u2500".repeat(78) + "\u256F");
  });

  it("closes the frame at exactly the configured width", () => {
    for (const width of [40, 60, 100]) {
      const lines = render((ui) => ui.deck.box("T", ["body"]), { width });

      for (const line of lines) {
        expect(visibleWidth(line)).toBe(width);
      }
    }
  });

  it("renders a footer in the bottom border", () => {
    const lines = render((ui) => ui.deck.box("T", [], { footer: "3 of 6 ready" }));

    const bottom = lines[lines.length - 1] ?? "";
    expect(bottom).toContain("3 of 6 ready");
    expect(bottom.startsWith("\u2570")).toBe(true);
  });

  it("truncates an over-long title instead of wrapping the frame", () => {
    const lines = render((ui) => ui.deck.box("x".repeat(300), ["body"]), { width: 40 });

    for (const line of lines) {
      expect(visibleWidth(line)).toBe(40);
    }
  });
});

describe("deck.cards", () => {
  it("lays cards out side by side when there is room", () => {
    const lines = render((ui) =>
      ui.deck.cards([
        { title: "One", lines: ["a"] },
        { title: "Two", lines: ["b"] },
      ]),
    );

    // Two top corners on the same row means they are columns, not
    // stacked boxes.
    const top = lines[0] ?? "";
    expect(top.indexOf("\u256D")).toBe(0);
    expect(top.indexOf("\u256D", 1)).toBeGreaterThan(0);
    expect(top).toContain("One");
    expect(top).toContain("Two");
  });

  it("stacks cards when the terminal is too narrow", () => {
    const lines = render(
      (ui) =>
        ui.deck.cards([
          { title: "One", lines: ["a"] },
          { title: "Two", lines: ["b"] },
        ]),
      { width: 30 },
    );

    // Stacked: each card starts its own top border on its own row.
    const tops = lines.filter((line) => line.trimStart().startsWith("\u256D"));
    expect(tops).toHaveLength(2);
  });

  it("keeps every card row within the width", () => {
    const lines = render(
      (ui) =>
        ui.deck.cards([
          { title: "Languages", lines: ["node", "typescript"] },
          { title: "Managers", lines: ["pnpm"] },
          { title: "Git", lines: ["main"] },
        ]),
      { width: 70 },
    );

    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(70);
    }
  });
});

describe("deck.meter", () => {
  it("draws a proportional bar with the counts", () => {
    const lines = render((ui) => ui.deck.meter({ label: "tools", value: 5, total: 6 }));

    expect(lines[0]).toContain("tools");
    expect(lines[0]).toContain("5/6");
  });

  it("fills roughly the requested proportion", () => {
    const full = render((ui) => ui.deck.meter({ label: "a", value: 10, total: 10 }))[0] ?? "";
    const half = render((ui) => ui.deck.meter({ label: "a", value: 5, total: 10 }))[0] ?? "";

    // A half-full bar uses fewer filled blocks than a full one.
    expect((full.match(/\u2588/g) ?? []).length).toBeGreaterThan(
      (half.match(/\u2588/g) ?? []).length,
    );
  });

  it("clamps a value above the total instead of overflowing the bar", () => {
    const lines = render((ui) => ui.deck.meter({ label: "a", value: 99, total: 6 }));

    expect(lines[0]).toContain("6/6");
    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(80);
    }
  });

  it("drops the bar and keeps the counts when there is no room", () => {
    // 16 columns: an 8-column label, a 3-character count and the two
    // two-space gaps leave nothing for a bar that says anything.
    const lines = render(
      (ui) => ui.deck.meter({ label: "a very long label indeed", value: 1, total: 3 }),
      { width: 16 },
    );

    expect(lines[0]).toContain("1/3");
    expect(lines[0]).not.toContain("\u2588");
    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(16);
    }
  });

  it("keeps a meter within the width when the label is very long", () => {
    const lines = render((ui) => ui.deck.meter({ label: "x".repeat(200), value: 5, total: 10 }), {
      width: 40,
    });

    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(40);
    }
  });
});

describe("deck.tree", () => {
  it("draws connectors that distinguish last from middle children", () => {
    const lines = render((ui) =>
      ui.deck.tree([{ label: "root", children: [{ label: "one" }, { label: "two" }] }]),
    );

    expect(lines[0]?.trimStart()).toBe("\u2022 root");
    expect(lines[1]).toContain("\u251C");
    expect(lines[2]).toContain("\u2514");
  });

  it("nests children under their parent", () => {
    const lines = render((ui) =>
      ui.deck.tree([{ label: "a", children: [{ label: "b", children: [{ label: "c" }] }] }]),
    );

    expect(lines[1]?.indexOf("b")).toBeGreaterThan(lines[0]?.indexOf("a") ?? 0);
    expect(lines[2]?.indexOf("c")).toBeGreaterThan(lines[1]?.indexOf("b") ?? 0);
  });

  it("renders a lone node without a connector", () => {
    expect(render((ui) => ui.deck.tree([{ label: "only" }]))[0]).toBe("\u2022 only");
  });
});

describe("deck.keys and deck.chips", () => {
  it("aligns key descriptions into a column", () => {
    const lines = render((ui) =>
      ui.deck.keys([
        { keys: "-h", description: "help" },
        { keys: "--json", description: "machine output" },
      ]),
    );

    expect(lines[0]).toContain("[-h]");
    expect(lines[1]).toContain("[--json]");
    // Descriptions start at the same column even though the caps differ.
    expect(lines[0]?.indexOf("help")).toBe(lines[1]?.indexOf("machine output"));
  });

  it("wraps chips instead of overflowing the width", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({ text: `chip-${String(index)}` }));
    const lines = render((ui) => ui.deck.chips(items), { width: 40 });

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(40);
    }
  });
});

describe("deck.banner", () => {
  it("draws the name, the tagline and a rule", () => {
    const lines = render((ui) => ui.deck.banner("devix", "know your environment", "1.0.0"), {
      width: 30,
    });

    expect(lines[0]).toBe("devix 1.0.0");
    expect(lines[1]).toBe("know your environment");
    expect(lines[2]).toBe("\u2500".repeat(30));
  });
});

describe("symbol sets stay printable", () => {
  it("keeps every ascii symbol inside printable ascii", () => {
    // A Windows console renders anything outside this range as
    // mojibake, which is the whole reason the ASCII set exists.
    const printable = new RegExp(`^[${String.fromCharCode(32)}-${String.fromCharCode(126)}]*$`);

    for (const [name, value] of Object.entries(symbolsFor(false))) {
      expect(value, `symbol ${name}`).toMatch(printable);
    }
  });
});
