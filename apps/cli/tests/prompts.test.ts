import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  promptMissingScaffoldArgs,
  promptScaffoldSpec,
  PromptCancelledError,
  PromptSession,
  type PromptChoice,
} from "../src/lib/prompts.js";

const CHOICES: readonly PromptChoice[] = [
  { id: "fabric", name: "Fabric", description: "Fabric mod skeleton" },
  { id: "paper", name: "Paper", description: "Paper plugin skeleton" },
  { id: "spigot", name: "Spigot" },
];

/** A stream pair with the given scripted answers, plus captured output. */
function makeStreams(...answers: string[]): {
  streams: {
    input: PassThrough & { isTTY?: boolean };
    output: PassThrough;
  };
  outputText: () => string;
} {
  const input = new PassThrough();
  const output = new PassThrough();
  let captured = "";
  output.on("data", (chunk: Buffer) => {
    captured += chunk.toString("utf8");
  });
  for (const answer of answers) {
    input.write(`${answer}\n`);
  }
  input.end();
  return { streams: { input, output }, outputText: () => captured };
}

describe("PromptSession", () => {
  it("choice accepts an id or a list position", async () => {
    const byId = makeStreams("paper");
    const sessionA = new PromptSession(byId.streams);
    expect(await sessionA.choice("Pick", CHOICES)).toBe("paper");
    sessionA.close();

    const byNumber = makeStreams("3");
    const sessionB = new PromptSession(byNumber.streams);
    expect(await sessionB.choice("Pick", CHOICES)).toBe("spigot");
    sessionB.close();
  });

  it("choice re-asks after an invalid answer", async () => {
    const { streams, outputText } = makeStreams("wurm", "99", "1");
    const session = new PromptSession(streams);

    expect(await session.choice("Pick", CHOICES)).toBe("fabric");
    expect(outputText()).toContain("Enter a number between 1 and 3");
    session.close();
  });

  it("multiChoice parses comma/space separated ids and numbers", async () => {
    const { streams } = makeStreams("1, fabric  3");
    const session = new PromptSession(streams);

    expect(await session.multiChoice("Pick", CHOICES)).toEqual(["fabric", "spigot"]);
    session.close();
  });

  it("multiChoice returns [] for 0 and keeps the default on an empty answer", async () => {
    const none = makeStreams("0");
    const sessionA = new PromptSession(none.streams);
    expect(await sessionA.multiChoice("Pick", CHOICES)).toEqual([]);
    sessionA.close();

    const defaulted = makeStreams("");
    const sessionB = new PromptSession(defaulted.streams);
    expect(await sessionB.multiChoice("Pick", CHOICES, ["spigot"])).toEqual(["spigot"]);
    sessionB.close();
  });

  it("multiChoice re-asks when an entry is invalid", async () => {
    const { streams, outputText } = makeStreams("1, wurm", "2");
    const session = new PromptSession(streams);

    expect(await session.multiChoice("Pick", CHOICES)).toEqual(["paper"]);
    expect(outputText()).toContain("comma separated");
    session.close();
  });

  it("text re-asks on empty answers and optionalText falls back", async () => {
    const { streams, outputText } = makeStreams("", "  ", "EggCannon");
    const session = new PromptSession(streams);

    expect(await session.text("Name")).toBe("EggCannon");
    expect(outputText()).toContain("cannot be empty");
    session.close();

    const optional = makeStreams("");
    const sessionB = new PromptSession(optional.streams);
    expect(await sessionB.optionalText("Package", "com.example.x")).toBe("com.example.x");
    sessionB.close();
  });
});

describe("promptScaffoldSpec", () => {
  const kinds = [
    { id: "mod", name: "Mod" },
    { id: "plugin", name: "Plugin" },
  ];
  const platformsByKind: Record<string, readonly PromptChoice[]> = {
    mod: [
      { id: "fabric", name: "Fabric" },
      { id: "forge", name: "Forge" },
    ],
    plugin: [{ id: "paper", name: "Paper" }],
  };
  const modulesByKind: Record<string, readonly PromptChoice[]> = {
    mod: [
      { id: "api", name: "API" },
      { id: "core", name: "Core" },
    ],
    plugin: [{ id: "api", name: "API" }],
  };

  it("walks the full flow: kind, platforms, modules, name, versions", async () => {
    const { streams, outputText } = makeStreams(
      "mod", // kind
      "1,2", // platforms: fabric+forge
      "api", // modules
      "Cool Sword", // name
      "", // version -> default 0.1.0
      "", // mc -> default 26.3
      "", // package -> default
    );

    const spec = await promptScaffoldSpec(kinds, platformsByKind, modulesByKind, {}, streams);

    expect(spec).toMatchObject({
      kind: "mod",
      platforms: ["fabric", "forge"],
      modules: ["api"],
      name: "Cool Sword",
      version: "0.1.0",
      minecraftVersion: "26.3",
    });
    expect(spec.packageName).toBe("com.example.coolsword");
    expect(outputText()).toContain("What do you want to build");
    expect(outputText()).toContain("Target platform(s)");
    expect(outputText()).toContain("Extra modules");
  });

  it("skips the questions answered by argv", async () => {
    const { streams, outputText } = makeStreams(
      "1,2", // platforms
      "api,core", // modules
      "My Mod", // name
      "", // version
      "", // mc
      "", // package
    );

    const spec = await promptScaffoldSpec(
      kinds,
      platformsByKind,
      modulesByKind,
      { kind: "mod", modules: ["api"] },
      streams,
    );

    expect(spec.kind).toBe("mod");
    expect(spec.platforms).toEqual(["fabric", "forge"]);
    expect(spec.modules).toEqual(["api"]);
    expect(outputText()).not.toContain("What do you want to build");
    expect(outputText()).not.toContain("Extra modules");
  });

  it("passes everything through without prompting when argv covers it", async () => {
    const { streams, outputText } = makeStreams();
    const input = streams.input;
    input.end();

    const spec = await promptScaffoldSpec(
      kinds,
      platformsByKind,
      modulesByKind,
      {
        kind: "plugin",
        platforms: ["paper"],
        modules: [],
        name: "QueueBoard",
        version: "1.0.0",
        minecraftVersion: "1.21.1",
        packageName: "com.example.queue",
      },
      streams,
    );

    expect(spec).toMatchObject({
      kind: "plugin",
      platforms: ["paper"],
      modules: [],
      name: "QueueBoard",
      version: "1.0.0",
      packageName: "com.example.queue",
    });
    expect(outputText()).toBe("");
  });

  it("rejects with PromptCancelledError when input ends immediately", async () => {
    const { streams } = makeStreams();

    await expect(
      promptScaffoldSpec(kinds, platformsByKind, modulesByKind, {}, streams),
    ).rejects.toBeInstanceOf(PromptCancelledError);
  });
});

describe("PromptSession on a TTY", () => {
  /** A TTY-looking stream pair, with raw keys written and output captured. */
  function makeTty(...keys: string[]): {
    streams: { input: PassThrough & { isTTY?: boolean }; output: PassThrough };
    outputText: () => string;
  } {
    const input = new PassThrough() as PassThrough & { isTTY?: boolean };
    const output = new PassThrough();
    input.isTTY = true;
    output.isTTY = true;
    let captured = "";
    output.on("data", (chunk: Buffer) => {
      captured += chunk.toString("utf8");
    });
    for (const key of keys) {
      input.write(key);
    }
    return { streams: { input, output }, outputText: () => captured };
  }

  it("choice uses the arrow-key menu instead of a numbered list", async () => {
    const { streams } = makeTty("\u001b[B", "\r");

    const session = new PromptSession(streams);
    const picked = await session.choice("Pick", CHOICES);
    session.close();

    // Down once from Fabric lands on Paper.
    expect(picked).toBe("paper");
  });

  it("multiChoice toggles with space and confirms with enter", async () => {
    const { streams } = makeTty(" ", "\u001b[B", " ", "\r");

    const session = new PromptSession(streams);
    const picked = await session.multiChoice("Pick", CHOICES);
    session.close();

    expect(picked.sort()).toEqual(["fabric", "paper"]);
  });

  it("multiChoice pre-selects the defaults", async () => {
    const { streams } = makeTty("\r");

    const session = new PromptSession(streams);
    const picked = await session.multiChoice("Pick", CHOICES, ["spigot"]);
    session.close();

    expect(picked).toEqual(["spigot"]);
  });

  it("choice rejects with PromptCancelledError on Escape", async () => {
    const { streams } = makeTty("\u001b");

    const session = new PromptSession(streams);
    await expect(session.choice("Pick", CHOICES)).rejects.toBeInstanceOf(PromptCancelledError);
    session.close();
  });
});

describe("promptMissingScaffoldArgs (legacy)", () => {
  it("passes provided values through without prompting", async () => {
    const { streams, outputText } = makeStreams();

    const answers = await promptMissingScaffoldArgs(CHOICES, "forge", "My Mod", streams);

    expect(answers).toEqual({ platform: "forge", name: "My Mod" });
    expect(outputText()).toBe("");
  });

  it("accepts a platform id typed directly and re-asks empty names", async () => {
    const { streams, outputText } = makeStreams("", "QueueBoard");

    const answers = await promptMissingScaffoldArgs(CHOICES, "paper", undefined, streams);

    expect(answers).toEqual({ platform: "paper", name: "QueueBoard" });
    expect(outputText()).not.toContain("Platform:");
    expect(outputText()).toContain("cannot be empty");
  });

  it("rejects with PromptCancelledError when input ends immediately", async () => {
    const { streams } = makeStreams();

    await expect(
      promptMissingScaffoldArgs(CHOICES, undefined, "My Mod", streams),
    ).rejects.toBeInstanceOf(PromptCancelledError);
  });
});
