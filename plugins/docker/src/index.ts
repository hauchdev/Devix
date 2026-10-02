import { readFileSync } from "node:fs";

import type { PluginManifest } from "@devix-cli/core";

import { createDockerClient, defaultDockerRunner } from "./client.js";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version?: string;
};

/**
 * The version of the docker plugin, read from this package's own
 * manifest so the advertised plugin version always matches the
 * released package.
 */
export const PLUGIN_VERSION: string = manifest.version ?? "0.0.0";

/** Manifest of the docker plugin for the CLI registry. */
export const DOCKER_PLUGIN_MANIFEST: PluginManifest = {
  id: "docker",
  name: "Docker",
  version: PLUGIN_VERSION,
  description: "Docker diagnostics: availability, containers and images.",
  apiVersion: "1",
  capabilities: {
    commands: [
      {
        id: "docker",
        description: "Docker diagnostics and container/image listings.",
        module: "@devix-cli/docker",
        export: "commandHandlers",
      },
    ],
  },
};

export {
  DockerClient,
  createDockerClient,
  defaultDockerRunner,
  type ContainerSummary,
  type DockerAvailability,
  type DockerCommandResult,
  type DockerRunner,
  type ImageSummary,
} from "./client.js";

export { commandHandlers, createCommandHandlers } from "./handlers.js";

const shared = createDockerClient(defaultDockerRunner);

/**
 * Probes Docker with `docker version --format`. Every failure degrades
 * to an availability report: a missing CLI or stopped daemon is a
 * normal state to diagnose, not an exceptional error.
 */
export async function dockerAvailability(): Promise<import("./client.js").DockerAvailability> {
  return shared.availability();
}

/**
 * Lists running containers. Returns `undefined` when Docker is not
 * usable so callers can degrade gracefully instead of catching.
 */
export async function runningContainers(): Promise<
  import("./client.js").ContainerSummary[] | undefined
> {
  return shared.containers();
}

/**
 * Lists local images. Returns `undefined` when Docker is not usable.
 */
export async function images(): Promise<import("./client.js").ImageSummary[] | undefined> {
  return shared.images();
}
