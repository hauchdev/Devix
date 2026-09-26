import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  promptMissingScaffoldArgs,
  PromptCancelledError,
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

describe("promptMissingScaffoldArgs", () => {
  it("passes provided values through without prompting", async () => {
    const { streams, outputText } = makeStreams();

    const answers = await promptMissingScaffoldArgs(CHOICES, "forge", "My Mod", streams);

    expect(answers).toEqual({ platform: "forge", name: "My Mod" });
    expect(outputText()).toBe("");
  });

  it("accepts a platform id typed directly", async () => {
    const { streams } = makeStreams("paper", "QueueBoard");

    const answers = await promptMissingScaffoldArgs(CHOICES, undefined, undefined, streams);

    expect(answers).toEqual({ platform: "paper", name: "QueueBoard" });
  });

  it("accepts a choice by its list position", async () => {
    const { streams } = makeStreams("2", "QueueBoard");

    const answers = await promptMissingScaffoldArgs(CHOICES, undefined, undefined, streams);

    expect(answers).toEqual({ platform: "paper", name: "QueueBoard" });
  });

  it("re-asks after an invalid choice until the answer is valid", async () => {
    const { streams, outputText } = makeStreams("wurm", "99", "1", "My Mod");

    const answers = await promptMissingScaffoldArgs(CHOICES, undefined, undefined, streams);

    expect(answers).toEqual({ platform: "fabric", name: "My Mod" });
    expect(outputText()).toContain("Enter a number between 1 and 3");
    // The list is rendered once per attempt.
    expect(outputText().match(/Platform:/g)).toHaveLength(3);
  });

  it("re-asks for an empty project name", async () => {
    const { streams, outputText } = makeStreams("spigot", "", "   ", "EggCannon");

    const answers = await promptMissingScaffoldArgs(CHOICES, undefined, undefined, streams);

    expect(answers).toEqual({ platform: "spigot", name: "EggCannon" });
    expect(outputText()).toContain("cannot be empty");
  });

  it("only prompts for the name when the platform was given", async () => {
    const { streams, outputText } = makeStreams("OnlyName");

    const answers = await promptMissingScaffoldArgs(CHOICES, "velocity", undefined, streams);

    expect(answers).toEqual({ platform: "velocity", name: "OnlyName" });
    expect(outputText()).not.toContain("Platform:");
  });

  it("rejects with PromptCancelledError when input ends immediately", async () => {
    const { streams } = makeStreams();

    await expect(
      promptMissingScaffoldArgs(CHOICES, undefined, "My Mod", streams),
    ).rejects.toBeInstanceOf(PromptCancelledError);
  });
});
