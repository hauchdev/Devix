import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

/**
 * Streams the interactive prompts read from and write to. Injectable so
 * tests can script answers without a real terminal.
 */
export interface PromptStreams {
  readonly input: Readable & { readonly isTTY?: boolean };
  readonly output: Writable;
}

/** One selectable option rendered by the choice prompt. */
export interface PromptChoice {
  /** Value returned when the option is picked. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** Optional one-line description shown next to the name. */
  readonly description?: string;
}

/** The answers collected by `promptMissingScaffoldArgs`. */
export interface PromptAnswers {
  readonly platform: string;
  readonly name: string;
}

/** The input stream ended (EOF or Ctrl+C) before the prompts were answered. */
export class PromptCancelledError extends Error {
  constructor() {
    super("Input ended before the prompts were answered.");
    this.name = "PromptCancelledError";
  }
}

const DEFAULT_STREAMS: PromptStreams = { input: process.stdin, output: process.stdout };

/**
 * Asks for the scaffold arguments the user left out.
 *
 * Missing values are prompted interactively: a numbered choice list for
 * the platform and a free-text question for the name. Provided values
 * pass through untouched, so the command stays fully scriptable.
 *
 * Answers are read through a line queue rather than `rl.question`, so
 * input typed ahead (or piped in) is never dropped between questions.
 */
export async function promptMissingScaffoldArgs(
  choices: readonly PromptChoice[],
  platform: string | undefined,
  name: string | undefined,
  streams: PromptStreams = DEFAULT_STREAMS,
): Promise<PromptAnswers> {
  const rl = createInterface({ input: streams.input, output: streams.output });
  const lines = createLineQueue(rl);
  try {
    const resolvedPlatform =
      platform === undefined ? await askChoice(lines, streams, choices) : platform;
    const resolvedName =
      name === undefined || name.trim().length === 0 ? await askText(lines, streams) : name;
    return { platform: resolvedPlatform, name: resolvedName };
  } finally {
    rl.close();
  }
}

/**
 * FIFO of incoming lines with a single-slot waiter.
 *
 * Lines that arrive without a pending question are queued, not
 * dropped; a question asked after the stream closed fails with
 * `PromptCancelledError` instead of hanging.
 */
function createLineQueue(rl: ReturnType<typeof createInterface>): {
  next(): Promise<string>;
} {
  const pending: string[] = [];
  let waiting: { resolve: (line: string) => void; reject: (error: unknown) => void } | undefined;
  let finished = false;

  const finish = (): void => {
    finished = true;
    const waiter = waiting;
    waiting = undefined;
    waiter?.reject(new PromptCancelledError());
  };

  rl.on("line", (line: string) => {
    if (finished) {
      return;
    }
    const trimmed = line.trim();
    const waiter = waiting;
    if (waiter !== undefined) {
      waiting = undefined;
      waiter.resolve(trimmed);
    } else {
      pending.push(trimmed);
    }
  });
  rl.on("close", finish);
  rl.on("error", finish);
  rl.on("SIGINT", finish);

  return {
    next(): Promise<string> {
      const line = pending.shift();
      if (line !== undefined) {
        return Promise.resolve(line);
      }
      if (finished) {
        return Promise.reject(new PromptCancelledError());
      }
      return new Promise((resolve, reject) => {
        waiting = { resolve, reject };
      });
    },
  };
}

/** Renders the numbered choice list and re-asks until the answer matches. */
async function askChoice(
  lines: { next(): Promise<string> },
  streams: PromptStreams,
  choices: readonly PromptChoice[],
): Promise<string> {
  for (;;) {
    writeLine(streams, "? Platform:");
    choices.forEach((choice, index) => {
      const label =
        choice.description === undefined ? choice.name : `${choice.name} — ${choice.description}`;
      writeLine(streams, `  ${index + 1}) ${choice.id.padEnd(14)}${label}`);
    });
    const answer = (await ask(lines, streams, "Enter a number or platform id: ")).toLowerCase();
    const byId = choices.find((choice) => choice.id === answer);
    if (byId !== undefined) {
      return byId.id;
    }
    if (/^\d+$/.test(answer)) {
      const choice = choices[Number.parseInt(answer, 10) - 1];
      if (choice !== undefined) {
        return choice.id;
      }
    }
    writeLine(
      streams,
      `  Enter a number between 1 and ${choices.length} or a platform id (e.g. ${choices[0]?.id ?? "fabric"}).`,
    );
  }
}

/** Re-asks a free-text question until the answer is non-empty. */
async function askText(
  lines: { next(): Promise<string> },
  streams: PromptStreams,
): Promise<string> {
  for (;;) {
    const answer = await ask(lines, streams, "? Project name: ");
    if (answer.length > 0) {
      return answer;
    }
    writeLine(streams, "  The project name cannot be empty.");
  }
}

/** Writes the question, waits for the next line; EOF surfaces as PromptCancelledError. */
async function ask(
  lines: { next(): Promise<string> },
  streams: PromptStreams,
  question: string,
): Promise<string> {
  streams.output.write(question);
  try {
    return await lines.next();
  } catch (error) {
    if (error instanceof PromptCancelledError) {
      writeLine(streams, "");
    }
    throw error;
  }
}

function writeLine(streams: PromptStreams, line: string): void {
  streams.output.write(`${line}\n`);
}
