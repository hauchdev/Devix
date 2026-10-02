import { describe, expect, it } from "vitest";

import {
  DockerClient,
  dockerAvailability,
  images,
  runningContainers,
  type DockerCommandResult,
  type DockerRunner,
} from "../src/index.js";

/** A runner that records calls and replays scripted results. */
function fakeRunner(options: {
  exists?: boolean;
  results?: Record<string, DockerCommandResult>;
  throws?: boolean;
}): { runner: DockerRunner; calls: () => string[][] } {
  const calls: string[][] = [];

  const runner: DockerRunner = {
    async exists(): Promise<boolean> {
      return options.exists ?? true;
    },
    async run(args: readonly string[]): Promise<DockerCommandResult> {
      calls.push([...args]);
      if (options.throws === true) {
        throw new Error("spawn failed");
      }
      const key = args[0] ?? "";
      return options.results?.[key] ?? { exitCode: 0, stdout: "", stderr: "" };
    },
  };

  return { runner, calls: () => calls };
}

function client(options: Parameters<typeof fakeRunner>[0]): DockerClient {
  return new DockerClient(fakeRunner(options).runner);
}

describe("DockerClient.availability", () => {
  it("reports cli-missing when the executable does not resolve", async () => {
    const docker = client({ exists: false });

    expect(await docker.availability()).toEqual({ available: false, reason: "cli-missing" });
  });

  it("reports the engine version when the daemon answers", async () => {
    const docker = client({
      results: { version: { exitCode: 0, stdout: "27.1.1\n", stderr: "" } },
    });

    expect(await docker.availability()).toEqual({ available: true, version: "27.1.1" });
  });

  it("reports daemon-down on a non-zero exit", async () => {
    const docker = client({ results: { version: { exitCode: 1, stdout: "", stderr: "boom" } } });

    expect(await docker.availability()).toEqual({ available: false, reason: "daemon-down" });
  });

  it("reports daemon-down when the process cannot be spawned", async () => {
    const docker = client({ throws: true });

    expect(await docker.availability()).toEqual({ available: false, reason: "daemon-down" });
  });

  it("reports daemon-down when the version comes back empty", async () => {
    const docker = client({ results: { version: { exitCode: 0, stdout: "  \n", stderr: "" } } });

    expect(await docker.availability()).toEqual({ available: false, reason: "daemon-down" });
  });

  it("asks for the server version through a format string", async () => {
    const { runner, calls } = fakeRunner({
      results: { version: { exitCode: 0, stdout: "27.1.1", stderr: "" } },
    });

    await new DockerClient(runner).availability();

    expect(calls()[0]).toEqual(["version", "--format", "{{.Server.Version}}"]);
  });
});

describe("DockerClient.containers", () => {
  it("returns undefined when docker is unusable", async () => {
    const docker = client({ exists: false });

    expect(await docker.containers()).toBeUndefined();
  });

  it("parses tab-separated rows", async () => {
    const docker = client({
      results: {
        version: { exitCode: 0, stdout: "27.1.1", stderr: "" },
        ps: {
          exitCode: 0,
          stdout: "abc123\tnode:22-alpine\tapi\tUp 3 hours\ndef456\tredis:7\tcache\tUp 1 minute\n",
          stderr: "",
        },
      },
    });

    const containers = await docker.containers();

    expect(containers).toEqual([
      { id: "abc123", image: "node:22-alpine", names: "api", status: "Up 3 hours" },
      { id: "def456", image: "redis:7", names: "cache", status: "Up 1 minute" },
    ]);
  });

  it("returns an empty list when nothing is running", async () => {
    const docker = client({
      results: {
        version: { exitCode: 0, stdout: "27.1.1", stderr: "" },
        ps: { exitCode: 0, stdout: "\n\n", stderr: "" },
      },
    });

    expect(await docker.containers()).toEqual([]);
  });

  it("tolerates a truncated row", async () => {
    const docker = client({
      results: {
        version: { exitCode: 0, stdout: "27.1.1", stderr: "" },
        ps: { exitCode: 0, stdout: "only-one-field\n", stderr: "" },
      },
    });

    expect(await docker.containers()).toEqual([
      { id: "only-one-field", image: "", names: "", status: "" },
    ]);
  });
});

describe("DockerClient.images", () => {
  it("returns undefined when docker is unusable", async () => {
    const docker = client({ exists: false });

    expect(await docker.images()).toBeUndefined();
  });

  it("parses repository, tag and size", async () => {
    const docker = client({
      results: {
        version: { exitCode: 0, stdout: "27.1.1", stderr: "" },
        images: {
          exitCode: 0,
          stdout: "node\t22-alpine\t128MB\nredis\t7\t42.1MB\n",
          stderr: "",
        },
      },
    });

    expect(await docker.images()).toEqual([
      { repository: "node", tag: "22-alpine", size: "128MB" },
      { repository: "redis", tag: "7", size: "42.1MB" },
    ]);
  });

  it("keeps an empty tag rather than dropping the row", async () => {
    const docker = client({
      results: {
        version: { exitCode: 0, stdout: "27.1.1", stderr: "" },
        images: { exitCode: 0, stdout: "orphan\t\t1.2MB\n", stderr: "" },
      },
    });

    expect(await docker.images()).toEqual([{ repository: "orphan", tag: "", size: "1.2MB" }]);
  });
});

describe("module-level functions", () => {
  // These probe the real machine. They only assert that the plugin never
  // throws and degrades to a report; the logic above is covered with a
  // fake runner, so no daemon is required.
  it("never throws in any environment", { timeout: 20_000 }, async () => {
    const availability = await dockerAvailability();

    if (availability.available) {
      expect(availability.version).toMatch(/^\d+\.\d+/);
    } else {
      expect(["cli-missing", "daemon-down"]).toContain(availability.reason);
    }

    const [containers, list] = await Promise.all([runningContainers(), images()]);

    if (!availability.available) {
      expect(containers).toBeUndefined();
      expect(list).toBeUndefined();
    } else {
      expect(Array.isArray(containers)).toBe(true);
      expect(Array.isArray(list)).toBe(true);
    }
  });
});
