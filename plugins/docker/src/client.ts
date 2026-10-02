import { runCommand, commandExists } from "@devix-cli/shell";

/** Availability of the Docker installation. */
export interface DockerAvailability {
  /** True when the docker CLI exists and the daemon answers. */
  readonly available: boolean;
  /** Docker engine version, when available. */
  readonly version?: string;
  /** Why Docker is unavailable, when it is. */
  readonly reason?: "cli-missing" | "daemon-down";
}

/** One running container from `docker ps`. */
export interface ContainerSummary {
  readonly id: string;
  readonly image: string;
  readonly names: string;
  readonly status: string;
}

/** One image from `docker images`. */
export interface ImageSummary {
  readonly repository: string;
  readonly tag: string;
  readonly size: string;
}

/** Result of one docker invocation. */
export interface DockerCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * How this client reaches docker.
 *
 * Injecting it is what makes the plugin testable: parsing is the part
 * that can break, and it must not require a running daemon to exercise.
 */
export interface DockerRunner {
  /** True when the executable resolves on PATH. */
  exists(command: string): Promise<boolean>;
  /** Runs docker with argv, never a shell string. */
  run(args: readonly string[], timeoutMs: number): Promise<DockerCommandResult>;
}

/** Splits a tab-separated `docker --format` line, tolerating short rows. */
function parseRow(line: string, keys: readonly string[]): Record<string, string> {
  const parts = line.split("\t");
  const row: Record<string, string> = {};
  keys.forEach((key, index) => {
    row[key] = parts[index] ?? "";
  });
  return row;
}

const CONTAINER_KEYS = ["id", "image", "names", "status"] as const;
const IMAGE_KEYS = ["repository", "tag", "size"] as const;

/** Non-empty lines of a `--format` listing. */
function listingLines(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line.trim().length > 0);
}

/**
 * A Docker client bound to one runner.
 *
 * Every method degrades rather than throws: a missing CLI or a stopped
 * daemon is a state to report, not an error to propagate.
 */
export class DockerClient {
  private readonly runner: DockerRunner;

  constructor(runner: DockerRunner) {
    this.runner = runner;
  }

  /** Probes the CLI and the daemon. */
  async availability(): Promise<DockerAvailability> {
    if (!(await this.runner.exists("docker"))) {
      return { available: false, reason: "cli-missing" };
    }

    let result: DockerCommandResult;
    try {
      result = await this.runner.run(["version", "--format", "{{.Server.Version}}"], 10_000);
    } catch {
      // A timeout or a spawn failure is indistinguishable from a daemon
      // that never answered.
      return { available: false, reason: "daemon-down" };
    }

    if (result.exitCode !== 0) {
      return { available: false, reason: "daemon-down" };
    }

    const version = result.stdout.trim();
    return version.length > 0
      ? { available: true, version }
      : { available: false, reason: "daemon-down" };
  }

  /** Lists running containers, or `undefined` when docker is unusable. */
  async containers(): Promise<ContainerSummary[] | undefined> {
    const availability = await this.availability();
    if (!availability.available) {
      return undefined;
    }

    const result = await this.runner.run(
      ["ps", "--format", "{{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}"],
      30_000,
    );

    return listingLines(result.stdout).map((line) => {
      const row = parseRow(line, CONTAINER_KEYS);
      return {
        id: row["id"] ?? "",
        image: row["image"] ?? "",
        names: row["names"] ?? "",
        status: row["status"] ?? "",
      };
    });
  }

  /** Lists local images, or `undefined` when docker is unusable. */
  async images(): Promise<ImageSummary[] | undefined> {
    const availability = await this.availability();
    if (!availability.available) {
      return undefined;
    }

    const result = await this.runner.run(
      ["images", "--format", "{{.Repository}}\t{{.Tag}}\t{{.Size}}"],
      30_000,
    );

    return listingLines(result.stdout).map((line) => {
      const row = parseRow(line, IMAGE_KEYS);
      return {
        repository: row["repository"] ?? "",
        tag: row["tag"] ?? "",
        size: row["size"] ?? "",
      };
    });
  }
}

/** The runner used in production: real processes, argv arrays, timeouts. */
export const defaultDockerRunner: DockerRunner = {
  async exists(command: string): Promise<boolean> {
    return commandExists(command);
  },

  async run(args: readonly string[], timeoutMs: number): Promise<DockerCommandResult> {
    const result = await runCommand("docker", args, { timeoutMs });
    // A null exit code means the process died on a signal rather than
    // exiting, which for our purposes is a failure, not a success.
    return {
      exitCode: result.exitCode ?? -1,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
};

/** Creates a client bound to a runner. */
export function createDockerClient(runner: DockerRunner = defaultDockerRunner): DockerClient {
  return new DockerClient(runner);
}
