import type { CommandOutput } from "@devix-cli/output";
import { describe, expect, it } from "vitest";

import {
  commandHandlers,
  createCommandHandlers,
  createDockerClient,
  type DockerCommandResult,
} from "../src/index.js";

/** Handlers over a scripted runner: no daemon required. */
function handlersWith(results: Record<string, DockerCommandResult>, exists = true) {
  return createCommandHandlers(
    createDockerClient({
      async exists(): Promise<boolean> {
        return exists;
      },
      async run(args: readonly string[]): Promise<DockerCommandResult> {
        return results[args[0] ?? ""] ?? { exitCode: 0, stdout: "", stderr: "" };
      },
    }),
  );
}

const UP = { version: { exitCode: 0, stdout: "27.1.1", stderr: "" } };

/** Text payload of a successful handler result. */
function text(result: CommandOutput<unknown> | undefined): string {
  return result?.ok === true ? String(result.data) : "";
}

describe("docker status", () => {
  it("reports the engine version", async () => {
    const result = await handlersWith(UP)["docker"]?.({ argv: ["status"], flags: {} });

    expect(text(result)).toBe("Docker available: 27.1.1");
  });

  it("names the reason when the CLI is missing", async () => {
    const result = await handlersWith({}, false)["docker"]?.({ argv: ["status"], flags: {} });

    expect(text(result)).toBe("Docker unavailable: cli-missing");
  });

  it("returns structured data with --json", async () => {
    const result = await handlersWith(UP)["docker"]?.({
      argv: ["status"],
      flags: { json: true },
    });

    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.data).toEqual({ available: true, version: "27.1.1" });
    }
  });
});

describe("docker ps", () => {
  it("lists containers one per line", async () => {
    const handlers = handlersWith({
      ...UP,
      ps: { exitCode: 0, stdout: "a1\tnode:22\tapi\tUp 2 hours\n", stderr: "" },
    });

    const result = await handlers["docker"]?.({ argv: ["ps"], flags: {} });

    expect(text(result)).toBe("a1  node:22  api  Up 2 hours");
  });

  it("says so when nothing is running", async () => {
    const handlers = handlersWith({ ...UP, ps: { exitCode: 0, stdout: "", stderr: "" } });

    expect(text(await handlers["docker"]?.({ argv: ["ps"], flags: {} }))).toBe(
      "No running containers.",
    );
  });

  it("degrades when docker is unusable", async () => {
    expect(text(await handlersWith({}, false)["docker"]?.({ argv: ["ps"], flags: {} }))).toBe(
      "Docker unavailable.",
    );
  });

  it("returns an empty array with --json when unavailable", async () => {
    const result = await handlersWith({}, false)["docker"]?.({
      argv: ["ps"],
      flags: { json: true },
    });

    if (result?.ok) {
      expect(result.data).toEqual([]);
    }
  });
});

describe("docker images", () => {
  it("lists images as repository:tag", async () => {
    const handlers = handlersWith({
      ...UP,
      images: { exitCode: 0, stdout: "node\t22-alpine\t128MB\n", stderr: "" },
    });

    expect(text(await handlers["docker"]?.({ argv: ["images"], flags: {} }))).toBe(
      "node:22-alpine  128MB",
    );
  });

  it("says so when there are no images", async () => {
    const handlers = handlersWith({ ...UP, images: { exitCode: 0, stdout: "", stderr: "" } });

    expect(text(await handlers["docker"]?.({ argv: ["images"], flags: {} }))).toBe(
      "No local images.",
    );
  });

  it("degrades when docker is unusable", async () => {
    expect(text(await handlersWith({}, false)["docker"]?.({ argv: ["images"], flags: {} }))).toBe(
      "Docker unavailable.",
    );
  });

  it("returns an empty array with --json when there are none", async () => {
    const handlers = handlersWith({ ...UP, images: { exitCode: 0, stdout: "", stderr: "" } });
    const result = await handlers["docker"]?.({ argv: ["images"], flags: { json: true } });

    if (result?.ok) {
      expect(result.data).toEqual([]);
    }
  });
});

describe("docker invalid operation", () => {
  it("reports the unknown operation as an error", async () => {
    const result = await handlersWith(UP)["docker"]?.({ argv: ["nope"], flags: {} });

    expect(result?.ok).toBe(false);
    if (result !== undefined && !result.ok) {
      expect(result.error.code).toBe("EINVALID_OPERATION");
      expect(result.error.message).toContain("nope");
    }
  });

  it("reports a missing operation as an error", async () => {
    const result = await handlersWith(UP)["docker"]?.({ argv: [], flags: {} });

    expect(result?.ok).toBe(false);
  });
});

describe("real environment", () => {
  // The exported handlers must survive a machine with no docker at all.
  it("never throws and always answers", { timeout: 20_000 }, async () => {
    for (const operation of ["status", "ps", "images"]) {
      const result = await commandHandlers["docker"]?.({ argv: [operation], flags: {} });
      expect(result?.ok).toBe(true);
    }
  });
});
