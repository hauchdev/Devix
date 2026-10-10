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

/** The answers collected by the scaffold spec prompts. */
export interface ScaffoldSpec {
  readonly kind: string;
  readonly platforms: string[];
  readonly modules: string[];
  readonly name: string;
  readonly version: string;
  readonly minecraftVersion: string;
  readonly packageName?: string;
}

/** The input stream ended (EOF or Ctrl+C) before the prompts were answered. */
export class PromptCancelledError extends Error {
  constructor() {
    super("Input ended before the prompts were answered.");
    this.name = "PromptCancelledError";
  }
}

const DEFAULT_STREAMS: PromptStreams = { input: process.stdin, output: process.stdout };

function writeLine(streams: PromptStreams, line: string): void {
  streams.output.write(`${line}\n`);
}

/**
 * A prompt session: one readline + line queue shared by every question
 * so input typed ahead (or piped in) is never dropped between questions.
 *
 * On a TTY the choice questions are answered with the arrow-key menu
 * instead, so the same prompts feel native in a terminal and stay
 * scriptable in a pipe. The readline interface is created lazily, on
 * first use of the line-based path, so an interactive session never
 * opens two readers on the same stream.
 */
export class PromptSession {
  private lines: { next(): Promise<string> } | undefined;
  private rl: ReturnType<typeof createInterface> | undefined;

  constructor(private readonly streams: PromptStreams = DEFAULT_STREAMS) {}

  /** True when the input is an interactive terminal. */
  private get isTty(): boolean {
    return this.streams.input.isTTY === true;
  }

  /** Opens the line reader on first use. */
  private ensureLines(): { next(): Promise<string> } {
    if (this.lines === undefined) {
      this.rl = createInterface({ input: this.streams.input, output: this.streams.output });
      this.lines = createLineQueue(this.rl);
    }
    return this.lines;
  }

  /** Renders a single-choice list and returns the picked id. */
  async choice(question: string, choices: readonly PromptChoice[]): Promise<string> {
    if (this.isTty) {
      const { runMenu } = await import("@devix-cli/ui");
      const result = await runMenu({
        prompt: question,
        items: choices.map((choice) => ({
          id: choice.id,
          name: choice.name,
          ...(choice.description === undefined ? {} : { description: choice.description }),
        })),
        input: this.streams.input as NodeJS.ReadStream,
        output: this.streams.output as NodeJS.WriteStream,
      });
      const picked = result.selected[0];
      if (result.cancelled || picked === undefined) {
        throw new PromptCancelledError();
      }
      return picked;
    }

    for (;;) {
      writeLine(this.streams, `? ${question}:`);
      choices.forEach((choice, index) => {
        const label =
          choice.description === undefined ? choice.name : `${choice.name} — ${choice.description}`;
        writeLine(this.streams, `  ${index + 1}) ${choice.id.padEnd(14)}${label}`);
      });
      const answer = (await this.ask("Enter a number or id: ")).toLowerCase();
      if (/^\d+$/.test(answer)) {
        const choice = choices[Number.parseInt(answer, 10) - 1];
        if (choice !== undefined) {
          return choice.id;
        }
      }
      const byId = choices.find((choice) => choice.id === answer);
      if (byId !== undefined) {
        return byId.id;
      }
      writeLine(
        this.streams,
        `  Enter a number between 1 and ${choices.length} or an id (e.g. ${choices[0]?.id ?? "id"}).`,
      );
    }
  }

  /**
   * Renders a multi-select list. On a TTY the arrow-key menu is used;
   * in a pipe it accepts comma/space separated numbers or ids, where an
   * empty answer returns the defaults and `0` returns nothing.
   */
  async multiChoice(
    question: string,
    choices: readonly PromptChoice[],
    defaults: readonly string[] = [],
  ): Promise<string[]> {
    if (this.isTty) {
      const { runMenu } = await import("@devix-cli/ui");
      const result = await runMenu({
        prompt: question,
        items: choices.map((choice) => ({
          id: choice.id,
          name: choice.name,
          ...(choice.description === undefined ? {} : { description: choice.description }),
          ...(defaults.includes(choice.id) ? { selected: true } : {}),
        })),
        multi: true,
        input: this.streams.input as NodeJS.ReadStream,
        output: this.streams.output as NodeJS.WriteStream,
      });
      if (result.cancelled) {
        throw new PromptCancelledError();
      }
      return [...result.selected];
    }

    for (;;) {
      writeLine(this.streams, `? ${question}:`);
      choices.forEach((choice, index) => {
        const label =
          choice.description === undefined ? choice.name : `${choice.name} — ${choice.description}`;
        writeLine(this.streams, `  ${index + 1}) ${choice.id.padEnd(14)}${label}`);
      });
      const defaultNote =
        defaults.length > 0 ? ` (default: ${defaults.join(", ")})` : " (0 for none)";
      const answer = await this.ask(`Enter ids/numbers, comma separated${defaultNote}: `);
      if (answer.trim().length === 0) {
        return [...defaults];
      }
      const parsed = parseMultiAnswer(answer, choices);
      if (parsed !== undefined) {
        return parsed;
      }
      writeLine(
        this.streams,
        `  Enter numbers or ids between 1 and ${choices.length}, comma separated (0 for none).`,
      );
    }
  }

  /** Re-asks a free-text question until the answer is non-empty. */
  async text(question: string): Promise<string> {
    for (;;) {
      const answer = await this.ask(`? ${question}: `);
      if (answer.length > 0) {
        return answer;
      }
      writeLine(this.streams, "  The answer cannot be empty.");
    }
  }

  /** Asks optional text: empty answers resolve to undefined. */
  async optionalText(question: string, fallback?: string): Promise<string | undefined> {
    const hint = fallback === undefined ? "" : ` (default: ${fallback})`;
    const answer = await this.ask(`? ${question}${hint}: `);
    const trimmed = answer.trim();
    return trimmed.length === 0 ? fallback : trimmed;
  }

  /** Writes the question and waits for the next line; EOF cancels. */
  private async ask(question: string): Promise<string> {
    this.streams.output.write(question);
    try {
      return await this.ensureLines().next();
    } catch (error) {
      if (error instanceof PromptCancelledError) {
        writeLine(this.streams, "");
      }
      throw error;
    }
  }

  /** Closes the line reader, when one was ever opened. */
  close(): void {
    this.rl?.close();
  }
}

/** Parses a multi-select answer into choice ids (undefined when invalid). */
function parseMultiAnswer(answer: string, choices: readonly PromptChoice[]): string[] | undefined {
  const tokens = answer
    .split(/[, ]+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return [];
  }
  const ids: string[] = [];
  for (const token of tokens) {
    if (token === "0") {
      continue;
    }
    let id: string | undefined;
    if (/^\d+$/.test(token)) {
      const choice = choices[Number.parseInt(token, 10) - 1];
      id = choice?.id;
    } else {
      id = choices.find((choice) => choice.id === token)?.id;
    }
    if (id === undefined) {
      return undefined;
    }
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Asks for the scaffold arguments the user left out: project kind,
 * target platform(s) (multi-select), optional extra modules, then the
 * free-text name and the version/package/mc details. Provided values
 * pass through untouched, so the command stays fully scriptable.
 */
export async function promptScaffoldSpec(
  kinds: readonly PromptChoice[],
  platformsByKind: Readonly<Record<string, readonly PromptChoice[]>>,
  modulesByKind: Readonly<Record<string, readonly PromptChoice[]>>,
  partial: {
    kind?: string;
    platforms?: readonly string[];
    modules?: readonly string[];
    name?: string;
    version?: string;
    minecraftVersion?: string;
    packageName?: string;
  },
  streams: PromptStreams = DEFAULT_STREAMS,
): Promise<ScaffoldSpec> {
  const session = new PromptSession(streams);
  try {
    const kind = partial.kind ?? (await session.choice("What do you want to build", kinds));
    const platformChoices = platformsByKind[kind] ?? [];
    const platforms =
      partial.platforms !== undefined && partial.platforms.length > 0
        ? [...partial.platforms]
        : await session.multiChoice("Target platform(s)", platformChoices, [
            platformChoices[0]?.id ?? "",
          ]);
    const moduleChoices = modulesByKind[kind] ?? [];
    // An explicit empty modules list answers the question too.
    const modules =
      partial.modules !== undefined
        ? [...partial.modules]
        : await session.multiChoice("Extra modules", moduleChoices, []);
    const name = partial.name === undefined ? await session.text("Project name") : partial.name;
    const version =
      partial.version ?? (await session.optionalText("Project version", "0.1.0")) ?? "0.1.0";
    const minecraftVersion =
      partial.minecraftVersion ??
      (await session.optionalText("Minecraft version", "26.3")) ??
      "26.3";
    const packageName =
      partial.packageName ??
      (await session.optionalText("Java package", `com.example.${slugify(name)}`));
    return {
      kind,
      platforms,
      modules,
      name,
      version,
      minecraftVersion,
      ...(packageName === undefined ? {} : { packageName }),
    };
  } finally {
    session.close();
  }
}

/** Package token used in default packages: lowercased, identifier-safe. */
function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug.length > 0 ? slug : "project";
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
