import { describe, expect, it } from "vitest";

import { createPainter, DEFAULT_THEME, type Theme } from "../src/theme.js";

/** Every semantic role the palette defines. */
const ROLES = [
  "primary",
  "secondary",
  "success",
  "warning",
  "danger",
  "muted",
  "border",
  "surface",
] as const;

describe("theme roles", () => {
  it("defines a colour at both fidelities for every role", () => {
    for (const role of ROLES) {
      const color = DEFAULT_THEME[role];

      expect(typeof color.basic, `${role}.basic`).toBe("number");
      expect(typeof color.rich, `${role}.rich`).toBe("number");
    }
  });

  it("keeps the 16-colour codes inside the ANSI basic range", () => {
    for (const role of ROLES) {
      // 30-37 and 90-97 are the only basic codes that exist; anything
      // else renders as garbage on a basic terminal.
      const basic = DEFAULT_THEME[role].basic;
      const isForeground = basic >= 30 && basic <= 37;
      const isBright = basic >= 90 && basic <= 97;

      expect(isForeground || isBright, `${role}.basic=${String(basic)}`).toBe(true);
    }
  });

  it("keeps the 256-palette codes inside the palette", () => {
    for (const role of ROLES) {
      const rich = DEFAULT_THEME[role].rich;

      expect(rich, `${role}.rich`).toBeGreaterThanOrEqual(0);
      expect(rich, `${role}.rich`).toBeLessThanOrEqual(255);
    }
  });
});

describe("Painter", () => {
  it("returns text untouched when colour is disabled", () => {
    const painter = createPainter("none");

    expect(painter.enabled).toBe(false);
    expect(painter.paint("primary", "hi")).toBe("hi");
    expect(painter.behind("surface", "hi")).toBe("hi");
    expect(painter.strong("primary", "hi")).toBe("hi");
    expect(painter.faint("muted", "hi")).toBe("hi");
  });

  it("emits basic codes for a 16-colour terminal", () => {
    const painter = createPainter("basic");

    expect(painter.paint("success", "ok")).toContain("32m");
    expect(painter.paint("danger", "bad")).toContain("31m");
  });

  it("emits 256-palette codes for an enhanced terminal", () => {
    const painter = createPainter("enhanced");

    expect(painter.paint("primary", "hi")).toContain("38;5;39");
    expect(painter.paint("warning", "careful")).toContain("38;5;214");
  });

  it("uses the background variant when painting behind", () => {
    const painter = createPainter("enhanced");

    expect(painter.behind("surface", "hi")).toContain("48;5;236");
  });

  it("paints a background with a basic code on a basic terminal", () => {
    const painter = createPainter("basic");

    // Basic backgrounds live ten above their foreground counterpart.
    const color = DEFAULT_THEME.surface.basic;
    expect(painter.behind("surface", "hi")).toContain(String(color + 10));
  });

  it("closes every sequence it opens", () => {
    const painter = createPainter("truecolor");

    for (const painted of [
      painter.paint("primary", "x"),
      painter.behind("surface", "x"),
      painter.strong("primary", "x"),
      painter.faint("muted", "x"),
    ]) {
      expect(painted.endsWith("m")).toBe(true);
      // A reset or a default-foreground must follow, or the colour
      // bleeds into everything printed after it.
      expect(painted).toMatch(/(\[[0-9]+m|\[[0-9;]+m)$/);
    }
  });

  it("accepts a custom theme so the palette can be retuned", () => {
    const custom: Theme = {
      ...DEFAULT_THEME,
      primary: { basic: 35, rich: 200 },
    };
    const painter = createPainter("basic", custom);

    expect(painter.paint("primary", "hi")).toContain("35m");
    // Untouched roles keep the default.
    expect(painter.paint("success", "ok")).toContain("32m");
  });

  it("still exposes a styler for callers that expect one", () => {
    const painter = createPainter("enhanced");

    expect(painter.styler.rich).toBe(true);
    expect(painter.styler.enabled).toBe(true);
  });

  it("reports a styler as disabled when colour is off", () => {
    expect(createPainter("none").styler.enabled).toBe(false);
  });
});
