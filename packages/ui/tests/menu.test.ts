import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import { runMenu, type MenuItem } from "../src/index.js";

/** A fake output stream that records everything written to it. */
function fakeOutput(options: { readonly tty: boolean } = { tty: false }): NodeJS.WriteStream & {
  readonly text: () => string;
} {
  const chunks: string[] = [];
  const stream = new PassThrough() as unknown as NodeJS.WriteStream & {
    readonly text: () => string;
  };
  (stream as unknown as { isTTY: boolean }).isTTY = options.tty;
  stream.write = ((chunk: string | Uint8Array): boolean => {
    chunks.push(String(chunk));
    return true;
  }) as typeof stream.write;
  (stream as unknown as { text: () => string }).text = () => chunks.join("");
  return stream;
}

const ITEMS: readonly MenuItem[] = [
  { id: "fabric", name: "Fabric", description: "Mod loader" },
  { id: "paper", name: "Paper", description: "Server" },
  { id: "velocity", name: "Velocity", description: "Proxy" },
];

describe("runMenu on a non-TTY", () => {
  it("renders a numbered list and picks by number", async () => {
    const output = fakeOutput({ tty: false });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;
    (input as unknown as { isTTY: boolean }).isTTY = false;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("2\n");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
    expect(result.cancelled).toBe(false);
    expect(output.text()).toContain("1) Fabric");
    expect(output.text()).toContain("3) Velocity");
  });

  it("returns nothing when the number is out of range", async () => {
    const output = fakeOutput({ tty: false });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("9\n");
    const result = await promise;

    expect(result.selected).toEqual([]);
  });

  it("numbers the options in catalog order", async () => {
    const output = fakeOutput({ tty: false });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("1\n");
    const result = await promise;

    expect(result.selected).toEqual(["fabric"]);
    const text = output.text();
    expect(text.indexOf("Fabric")).toBeLessThan(text.indexOf("Paper"));
    expect(text.indexOf("Paper")).toBeLessThan(text.indexOf("Velocity"));
  });
});

describe("runMenu on a TTY", () => {
  it("moves the cursor down with an arrow key before Enter", async () => {
    const output = fakeOutput({ tty: true });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;
    (input as unknown as { isTTY: boolean }).isTTY = true;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b[B");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
  });

  it("cancels on Escape without picking anything", async () => {
    const output = fakeOutput({ tty: true });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b");
    const result = await promise;

    expect(result.selected).toEqual([]);
    expect(result.cancelled).toBe(true);
  });

  it("cancels on Ctrl+C", async () => {
    const output = fakeOutput({ tty: true });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u0003");
    const result = await promise;

    expect(result.cancelled).toBe(true);
  });

  it("filters the list as characters are typed", async () => {
    const output = fakeOutput({ tty: true });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("pap");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
    expect(output.text()).toContain('filtered by "pap"');
  });

  it("erases a character with backspace", async () => {
    const output = fakeOutput({ tty: true });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("papx");
    input.write("\u007f");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
  });

  it("does not move above the first option", async () => {
    const output = fakeOutput({ tty: true });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b[A");
    input.write("\u001b[A");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["fabric"]);
  });

  it("does not move past the last option", async () => {
    const output = fakeOutput({ tty: true });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    for (let index = 0; index < 10; index += 1) {
      input.write("\u001b[B");
    }
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["velocity"]);
  });

  it("keeps every drawn line within the width", async () => {
    const output = fakeOutput({ tty: true });
    const input = new PassThrough() as unknown as NodeJS.ReadStream;
    const wide: readonly MenuItem[] = [
      { id: "a", name: "x".repeat(200), description: "y".repeat(200) },
    ];

    const promise = runMenu({ prompt: "Pick", items: wide, output, input, width: 40 });
    input.write("\r");
    await promise;

    for (const line of output.text().split("\n")) {
      // Escape sequences have zero width; strip them before measuring.
      const visible = line.replace(new RegExp(`${"\u001b"}\\[[0-9;]*[A-Za-z]`, "g"), "");
      expect(visible.length).toBeLessThanOrEqual(40);
    }
  });
});
