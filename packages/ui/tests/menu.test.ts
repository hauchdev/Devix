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

/** A fake input stream, optionally a terminal that supports raw mode. */
function fakeInput(
  options: { readonly tty?: boolean; readonly raw?: boolean } = {},
): NodeJS.ReadStream & { readonly rawCalls: boolean[]; readonly isRaw: boolean } {
  const rawCalls: boolean[] = [];
  const stream = new PassThrough() as unknown as NodeJS.ReadStream & {
    readonly rawCalls: boolean[];
    isRaw: boolean;
  };
  (stream as unknown as { isTTY: boolean }).isTTY = options.tty ?? true;
  stream.isRaw = options.raw ?? false;
  (stream as unknown as { setRawMode: (value: boolean) => void }).setRawMode = (value: boolean) => {
    rawCalls.push(value);
    stream.isRaw = value;
  };
  (stream as unknown as { rawCalls: boolean[] }).rawCalls = rawCalls;
  return stream;
}

/** Lets pending timers and stream callbacks run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const ITEMS: readonly MenuItem[] = [
  { id: "fabric", name: "Fabric", description: "Mod loader" },
  { id: "paper", name: "Paper", description: "Server" },
  { id: "velocity", name: "Velocity", description: "Proxy" },
];

describe("runMenu on a non-TTY", () => {
  it("renders a numbered list and picks by number", async () => {
    const output = fakeOutput({ tty: false });
    const input = fakeInput({ tty: false });

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
    const input = fakeInput({ tty: false });

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("9\n");
    const result = await promise;

    expect(result.selected).toEqual([]);
  });

  it("numbers the options in catalog order", async () => {
    const output = fakeOutput({ tty: false });
    const input = fakeInput({ tty: false });

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("1\n");
    const result = await promise;

    expect(result.selected).toEqual(["fabric"]);
    const text = output.text();
    expect(text.indexOf("Fabric")).toBeLessThan(text.indexOf("Paper"));
    expect(text.indexOf("Paper")).toBeLessThan(text.indexOf("Velocity"));
  });

  it("falls back to the list when the output is a terminal but the input is not", async () => {
    // Drawing a menu that cannot read keys would just hang.
    const output = fakeOutput({ tty: true });
    const input = fakeInput({ tty: false });

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("3\n");
    const result = await promise;

    expect(result.selected).toEqual(["velocity"]);
    expect(output.text()).toContain("1) Fabric");
  });
});

describe("runMenu on a TTY", () => {
  it("moves the cursor down with an arrow key before Enter", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b[B");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
  });

  it("reads an arrow key whose escape sequence arrives in two chunks", async () => {
    // A terminal may send ESC and `[B` in separate reads. Treating the
    // lone ESC as a cancel is what made the arrow keys close the menu.
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b");
    await settle();
    input.write("[B");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
    expect(result.cancelled).toBe(false);
  });

  it("cancels on a bare Escape", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b");
    const result = await promise;

    expect(result.selected).toEqual([]);
    expect(result.cancelled).toBe(true);
  });

  it("cancels on Ctrl+C", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u0003");
    const result = await promise;

    expect(result.cancelled).toBe(true);
  });

  it("treats a CRLF Enter as one keypress", async () => {
    // A terminal that sends CRLF must not register two Enters.
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b[B");
    input.write("\r\n");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
  });

  it("enables raw mode and restores it", async () => {
    // Without raw mode the terminal buffers keys until Enter, so the
    // arrow keys appear to do nothing.
    const output = fakeOutput({ tty: true });
    const input = fakeInput({ raw: false });

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    await settle();
    input.write("\r");
    await promise;

    expect(input.rawCalls).toEqual([true, false]);
    expect(input.isRaw).toBe(false);
  });

  it("restores raw mode when the user cancels", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b");
    await promise;

    expect(input.rawCalls).toEqual([true, false]);
  });

  it("does not erase anything above the menu on the first draw", async () => {
    // The first frame has nothing of ours above it; clearing would eat
    // whatever the command printed before opening the menu.
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    await settle();
    const beforeEnter = output.text();

    input.write("\r");
    await promise;

    expect(beforeEnter).not.toContain("\u001b[1A");
    expect(beforeEnter.startsWith("? Pick one\n")).toBe(true);
  });

  it("filters the list as characters are typed", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("pap");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
    expect(output.text()).toContain('filtered by "pap"');
  });

  it("erases a character with backspace", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("papx");
    input.write("\u007f");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["paper"]);
  });

  it("does not move above the first option", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick one", items: ITEMS, output, input });
    input.write("\u001b[A");
    input.write("\u001b[A");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["fabric"]);
  });

  it("does not move past the last option", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

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
    const input = fakeInput();
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

describe("runMenu multi-select on a TTY", () => {
  it("toggles with space and confirms with enter", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick", items: ITEMS, output, input, multi: true });
    input.write(" "); // select Fabric
    input.write("\u001b[B"); // down to Paper
    input.write(" "); // select Paper
    input.write("\r");
    const result = await promise;

    expect(result.selected.sort()).toEqual(["fabric", "paper"]);
  });

  it("toggles with tab as well as space", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick", items: ITEMS, output, input, multi: true });
    input.write("\t"); // tab selects Fabric
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["fabric"]);
  });

  it("untoggles an item that is toggled twice", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick", items: ITEMS, output, input, multi: true });
    input.write(" ");
    input.write(" ");
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual([]);
  });

  it("seeds the selection from the items", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();
    const preseeded: readonly MenuItem[] = [
      { id: "fabric", name: "Fabric", selected: true },
      { id: "paper", name: "Paper" },
    ];

    const promise = runMenu({ prompt: "Pick", items: preseeded, output, input, multi: true });
    input.write("\r");
    const result = await promise;

    expect(result.selected).toEqual(["fabric"]);
  });

  it("keeps a hidden selection when a filter hides it", async () => {
    const output = fakeOutput({ tty: true });
    const input = fakeInput();

    const promise = runMenu({ prompt: "Pick", items: ITEMS, output, input, multi: true });
    input.write(" "); // select Fabric (cursor 0)
    input.write("pap"); // filter down to Paper
    input.write("\r");
    const result = await promise;

    // Fabric is no longer visible, but it was selected and must survive.
    expect(result.selected).toEqual(["fabric"]);
  });
});

describe("runMenu multi-select off a TTY", () => {
  it("parses a comma separated list of numbers", async () => {
    const output = fakeOutput({ tty: false });
    const input = fakeInput({ tty: false });

    const promise = runMenu({ prompt: "Pick", items: ITEMS, output, input, multi: true });
    input.write("1, 3\n");
    const result = await promise;

    expect(result.selected.sort()).toEqual(["fabric", "velocity"]);
  });

  it("keeps the pre-selected defaults on an empty answer", async () => {
    const output = fakeOutput({ tty: false });
    const input = fakeInput({ tty: false });
    const preseeded: readonly MenuItem[] = [
      { id: "fabric", name: "Fabric", selected: true },
      { id: "paper", name: "Paper" },
    ];

    const promise = runMenu({ prompt: "Pick", items: preseeded, output, input, multi: true });
    input.write("\n");
    const result = await promise;

    expect(result.selected).toEqual(["fabric"]);
  });
});
