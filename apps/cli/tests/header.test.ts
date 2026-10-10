import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/subprocess.js";

/**
 * Every command must open the same way the landing panel does: the name,
 * one line of purpose, a full-width rule, then a blank line. The shape is
 * the contract; the words differ per command.
 */
const COMMANDS: readonly (readonly string[])[] = [
  ["status"],
  ["doctor"],
  ["detect"],
  ["config", "list"],
  ["plugin", "list"],
  ["minecraft", "list"],
  ["git", "status"],
  ["web", "detect"],
  ["docker", "status"],
];

describe("report headers", () => {
  for (const command of COMMANDS) {
    it(`devix ${command.join(" ")} opens with the standard header`, async () => {
      const { stdout } = await runCli([...command, "--no-color"]);
      const lines = stdout.split("\n");

      expect(lines[0]).toBe(`devix ${command.join(" ")}`);
      // The tagline is one line of prose, never empty.
      expect((lines[1] ?? "").trim().length).toBeGreaterThan(0);
      // The rule spans the terminal.
      expect(lines[2]).toMatch(/^-+$/);
      expect(lines[2]?.length).toBe(80);
      expect(lines[3]).toBe("");
    }, 30_000);
  }

  it("uses the same rule character as the section borders", async () => {
    // A header whose rule does not match the boxes below it is the exact
    // inconsistency this shape exists to remove.
    const { stdout } = await runCli(["status", "--no-color"], undefined, undefined, {
      DEVIX_UNICODE: "1",
    });
    const lines = stdout.split("\n");

    expect(lines[2]).toMatch(/^─+$/);
    expect(lines[4]?.startsWith("╭─")).toBe(true);
  }, 30_000);
});
