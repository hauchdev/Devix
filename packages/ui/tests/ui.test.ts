import { describe, expect, it } from "vitest";

import {
  createUi,
  padEndVisible,
  padStartVisible,
  Styler,
  symbolsFor,
  truncateVisible,
  visibleWidth,
} from "../src/index.js";

/** Renders into a buffer and returns the lines. */
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
  return chunks.join("").split("\n").slice(0, -1);
}

/** Strips ANSI so assertions can compare against plain text. */
function plain(lines: readonly string[]): string[] {
  // eslint-disable-next-line no-control-regex
  return lines.map((line) => line.replace(/\[[0-9;]*m/g, ""));
}

describe("Styler", () => {
  it("returns text untouched when color is disabled", () => {
    const styler = new Styler("none");

    expect(styler.accent("hi")).toBe("hi");
    expect(styler.bold("hi")).toBe("hi");
    expect(styler.success("hi")).toBe("hi");
    expect(styler.enabled).toBe(false);
  });

  it("emits 16-color codes for a basic terminal", () => {
    const styler = new Styler("basic");

    expect(styler.rich).toBe(false);
    expect(styler.accent("hi")).toContain("36m");
    expect(styler.success("hi")).toContain("32m");
  });

  it("emits 256-color codes for an enhanced terminal", () => {
    const styler = new Styler("enhanced");

    expect(styler.rich).toBe(true);
    expect(styler.accent("hi")).toContain("38;5;111");
    expect(styler.error("hi")).toContain("38;5;203");
  });

  it("closes every sequence it opens", () => {
    const styler = new Styler("truecolor");

    for (const styled of [styler.bold("x"), styler.accent("x"), styler.dim("x")]) {
      expect(styled.startsWith("[")).toBe(true);
      expect(styled.endsWith("m")).toBe(true);
    }
  });
});

describe("width helpers", () => {
  it("measures text ignoring ANSI sequences", () => {
    const styler = new Styler("enhanced");

    expect(visibleWidth(styler.accent("hello"))).toBe(5);
    expect(visibleWidth("hello")).toBe(5);
  });

  it("pads to a visible width", () => {
    const styler = new Styler("basic");

    expect(padEndVisible(styler.accent("ab"), 5)).toHaveLength(
      5 + (styler.accent("ab").length - 2),
    );
    expect(visibleWidth(padEndVisible("ab", 5))).toBe(5);
    expect(visibleWidth(padStartVisible("ab", 5))).toBe(5);
    expect(padStartVisible("ab", 5)).toBe("   ab");
  });

  it("never truncates when the text already fits", () => {
    expect(truncateVisible("abc", 5)).toBe("abc");
  });

  it("truncates with an ellipsis when it does not", () => {
    expect(truncateVisible("abcdef", 4)).toBe("abc…");
    expect(truncateVisible("abcdef", 1)).toBe("a");
  });
});

describe("symbols", () => {
  it("uses box drawing when unicode is available", () => {
    expect(symbolsFor(true).rule).toBe("─");
    expect(symbolsFor(true).success).toBe("✓");
  });

  it("falls back to pure ascii", () => {
    const ascii = symbolsFor(false);

    expect(ascii.rule).toBe("-");
    expect(ascii.success).toBe("v");
    // The ascii set must contain nothing outside printable ASCII.
    expect(/^[\x20-\x7e]*$/.test(Object.values(ascii).join(""))).toBe(true);
  });
});

describe("Ui output", () => {
  it("writes lines and blanks", () => {
    expect(render((ui) => ui.line("a").blank().line("b"))).toEqual(["a", "", "b"]);
  });

  it("draws a heading with a short hairline that fits the width", () => {
    const lines = render((ui) => ui.heading("Environment", { count: 6 }), { width: 40 });

    expect(plain(lines)[0]).toContain("Environment 6");
    // The rule is capped so a heading never becomes a full-width frame.
    expect(visibleWidth(lines[0] ?? "")).toBeLessThanOrEqual(40);
    expect(visibleWidth(lines[0] ?? "")).toBeGreaterThan(18);
  });

  it("truncates a heading that cannot fit the terminal", () => {
    const lines = render((ui) => ui.heading("A very long section title here"), { width: 12 });

    expect(visibleWidth(lines[0] ?? "")).toBeLessThanOrEqual(12);
  });

  it("draws a title without a rule", () => {
    expect(plain(render((ui) => ui.title("Devix")))).toEqual(["Devix"]);
  });

  it("aligns field labels into a column", () => {
    const lines = plain(
      render((ui) =>
        ui.fields([
          { label: "Node.js", value: "22.20.4", status: "ok" },
          { label: "Docker", status: "error" },
        ]),
      ),
    );

    const valueColumn = (lines[0] ?? "").indexOf("22.20.4");
    expect(valueColumn).toBeGreaterThan(0);
    // Both rows must put the value at the same column.
    expect(lines[1]?.indexOf("—")).toBe(valueColumn);
  });

  it("renders a status marker per field", () => {
    const lines = plain(render((ui) => ui.fields([{ label: "Git", value: "ok", status: "ok" }])));

    expect(lines[0]).toContain("✓");
  });

  it("renders a dash for fields without a value", () => {
    expect(plain(render((ui) => ui.fields([{ label: "Empty" }])))[0]).toContain("—");
  });

  it("omits the marker on rows with no status but keeps the column", () => {
    const lines = plain(
      render((ui) =>
        ui.fields([
          { label: "Plain", value: "first-value" },
          { label: "Ok", value: "second-value", status: "ok" },
        ]),
      ),
    );

    // The neutral row is indented, not marked: a bullet that means
    // nothing is decoration, not information.
    expect(lines[0]?.startsWith("  Plain")).toBe(true);
    expect(lines[1]?.startsWith("✓ Ok")).toBe(true);
    // Both values still start at the same column.
    expect(lines[0]?.indexOf("first-value")).toBe(lines[1]?.indexOf("second-value"));
  });

  it("renders a hint under its field", () => {
    const lines = plain(
      render((ui) => ui.fields([{ label: "Java", value: "21", hint: "Minecraft needs 21" }])),
    );

    expect(lines[1]).toContain("Minecraft needs 21");
  });

  it("returns early for an empty field list", () => {
    expect(render((ui) => ui.fields([]))).toEqual([]);
  });

  it("renders bullets for a list", () => {
    const lines = plain(render((ui) => ui.list(["one", "two"], { indent: 2 })));

    expect(lines[0]).toBe("  • one");
    expect(lines[1]).toBe("  • two");
  });

  it("uses ascii bullets when unicode is unavailable", () => {
    const lines = plain(render((ui) => ui.list(["one"]), { unicode: false }));

    expect(lines[0]).toBe("- one");
  });

  it("draws a table with sized columns", () => {
    const lines = plain(
      render((ui) =>
        ui.table(
          ["ID", "LABEL", "STATUS"],
          [
            { cells: ["a", "Alpha", "ok"], status: "ok" },
            { cells: ["b", "Beta", "failed"], status: "error" },
          ],
        ),
      ),
    );

    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("ID");
    expect(lines[2]).toContain("Alpha");
  });

  it("aligns the table header with the rows", () => {
    const lines = plain(
      render((ui) =>
        ui.table(
          ["BRANCH", "COMMIT"],
          [{ cells: ["main", "5834a6cb7"], status: "ok" }, { cells: ["other", "111111111"] }],
        ),
      ),
    );

    // Header, separator and data rows all start in the same column.
    const headerStart = lines[0]?.search(/\S/);
    expect(headerStart).toBe(2);
    expect(lines[1]?.search(/\S/)).toBe(2);
    expect(lines[2]?.search(/\S/)).toBe(0);
    expect(lines[3]?.search(/\S/)).toBe(2);
    // "main" and "other" share a column despite different markers.
    expect(lines[2]?.indexOf("main")).toBe(lines[3]?.indexOf("other"));
  });

  it("truncates the widest column on a narrow terminal", () => {
    const lines = plain(
      render((ui) => ui.table(["ID", "DESCRIPTION"], [{ cells: ["1", "a".repeat(120)] }]), {
        width: 40,
      }),
    );

    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(40);
    }
  });

  it("never truncates an identifier column below its longest token", () => {
    const lines = plain(
      render(
        (ui) =>
          ui.table(
            ["ID", "KIND", "DESCRIPTION"],
            [
              { cells: ["neoforge", "mod", "NeoForge mod skeleton ".repeat(4)] },
              { cells: ["bungeecord", "proxy-plugin", "BungeeCord proxy plugin ".repeat(3)] },
            ],
            { width: 78 },
          ),
        { width: 78 },
      ),
    );

    // Ids are single tokens: a truncated id is worse than no table.
    expect(lines.some((line) => line.includes("neoforge"))).toBe(true);
    expect(lines.some((line) => line.includes("bungeecord"))).toBe(true);
    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(78);
    }
  });

  it("draws a bordered panel", () => {
    const lines = plain(render((ui) => ui.panel("Title", ["body line"])));

    const inner = Math.max(visibleWidth("Title"), visibleWidth("body line"));
    const total = inner + 4;

    expect(lines[0]).toBe("╭" + "─".repeat(total - 2) + "╮");
    expect(lines[0]).toHaveLength(total);
    expect(lines[1]).toContain("Title");
    expect(lines[3]).toContain("body line");
    expect(lines[4]).toBe("╰" + "─".repeat(total - 2) + "╯");
  });

  it("draws an ascii panel when unicode is unavailable", () => {
    const lines = plain(render((ui) => ui.panel("T", ["b"]), { unicode: false }));

    expect(lines[0]?.startsWith("+")).toBe(true);
    expect(lines[0]).toContain("---");
  });

  it("keeps panel lines within the terminal width", () => {
    const lines = render((ui) => ui.panel("Title", ["x".repeat(200)]), { width: 30 });

    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(30);
    }
  });

  it("renders hints with an arrow", () => {
    expect(plain(render((ui) => ui.hint("then run devix doctor")))[0]).toBe(
      "→ then run devix doctor",
    );
  });

  it("centers short text", () => {
    const lines = plain(render((ui) => ui.centered("Devix"), { width: 11 }));

    expect(lines[0]).toBe("   Devix");
  });

  it("right-aligns a footnote with a one-column margin", () => {
    const lines = plain(render((ui) => ui.footnote("v1.0.0"), { width: 20 }));

    expect(lines[0]).toBe("             v1.0.0");
    // Right-aligned, one column short of the edge so tight terminals
    // do not wrap the footnote onto its own line.
    expect(visibleWidth(lines[0] ?? "")).toBe(19);
  });

  it("emits no ANSI when color is disabled", () => {
    const lines = render(
      (ui) => {
        ui.title("t");
        ui.heading("h");
        ui.fields([{ label: "a", value: "b", status: "ok" }]);
        ui.panel("p", ["x"]);
        ui.hint("y");
      },
      { color: "none" },
    );

    for (const line of lines) {
      // eslint-disable-next-line no-control-regex
      expect(line).not.toMatch(/\[/);
    }
  });

  it("colors output when a color level is available", () => {
    const lines = render((ui) => ui.title("Devix"), { color: "enhanced" });

    // eslint-disable-next-line no-control-regex
    expect(lines[0]).toMatch(/\[/);
  });
});
