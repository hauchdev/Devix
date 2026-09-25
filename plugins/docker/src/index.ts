import { runCommand } from "@devix/shell";

/** Availability of the Docker installation on this machine. */
export interface DockerAvailability {
  /** True when the docker CLI exists and the daemon answers. */
  readonly available: boolean;
  /** Docker engine version, when available. */
  readonly version?: string;
  /** Why Docker is unavailable, when it is. */
  readonly reason?: "cli-missing" | "daemon-down";
}

/**
 * Probes Docker with `docker version --format`. Every failure degrades
 * to an availability report: a missing CLI or stopped daemon is a
 * normal state to diagnose, not an exceptional error.
 */
export async function dockerAvailability(): Promise<DockerAvailability> {
  const { commandExists } = await import("@devix/shell");

  if (!(await commandExists("docker"))) {
    return { available: false, reason: "cli-missing" };
  }

  try {
    const result = await runCommand("docker", ["version", "--format", "{{.Server.Version}}"], {
      timeoutMs: 10_000,
    });
    if (result.exitCode !== 0) {
      return { available: false, reason: "daemon-down" };
    }
    return { available: true, version: result.stdout.trim() };
  } catch {
    return { available: false, reason: "daemon-down" };
  }
}

/** One running container from `docker ps`. */
export interface ContainerSummary {
  readonly id: string;
  readonly image: string;
  readonly names: string;
  readonly status: string;
}

/**
 * Lists running containers. Returns `undefined` when Docker is not
 * usable so callers can degrade gracefully instead of catching.
 */
export async function runningContainers(): Promise<ContainerSummary[] | undefined> {
  const availability = await dockerAvailability();
  if (!availability.available) {
    return undefined;
  }

  const result = await runCommand(
    "docker",
    ["ps", "--format", "{{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}"],
    { timeoutMs: 30_000 },
  );

  return result.stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [id, image, names, status] = line.split("\t");
      return { id: id ?? "", image: image ?? "", names: names ?? "", status: status ?? "" };
    });
}

/** One image from `docker images`. */
export interface ImageSummary {
  readonly repository: string;
  readonly tag: string;
  readonly size: string;
}

/**
 * Lists local images. Returns `undefined` when Docker is not usable.
 */
export async function images(): Promise<ImageSummary[] | undefined> {
  const availability = await dockerAvailability();
  if (!availability.available) {
    return undefined;
  }

  const result = await runCommand(
    "docker",
    ["images", "--format", "{{.Repository}}\t{{.Tag}}\t{{.Size}}"],
    { timeoutMs: 30_000 },
  );

  return result.stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [repository, tag, size] = line.split("\t");
      return { repository: repository ?? "", tag: tag ?? "", size: size ?? "" };
    });
}
