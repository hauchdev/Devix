import { err, ok, type CommandHandler } from "@devix-cli/output";

import type { DockerClient } from "./client.js";
import { createDockerClient } from "./client.js";

/**
 * Builds the docker command handlers over a client.
 *
 * Injecting the client is what lets the handlers be tested without a
 * running daemon: the branches that matter are the ones where docker is
 * present but returns nothing.
 */
export function createCommandHandlers(client: DockerClient): Record<string, CommandHandler> {
  const docker: CommandHandler = async ({ argv, flags }) => {
    const wantsJson = flags.json === true;
    const operation = argv[0];

    if (operation === "status") {
      const availability = await client.availability();
      if (wantsJson) {
        return ok(availability);
      }
      if (!availability.available) {
        return ok(`Docker unavailable: ${availability.reason ?? "unknown"}`);
      }
      return ok(`Docker available: ${availability.version ?? "version unknown"}`);
    }

    if (operation === "ps") {
      const containers = await client.containers();
      if (wantsJson) {
        return ok(containers ?? []);
      }
      if (containers === undefined) {
        return ok("Docker unavailable.");
      }
      if (containers.length === 0) {
        return ok("No running containers.");
      }
      return ok(
        containers
          .map(
            (container) =>
              `${container.id}  ${container.image}  ${container.names}  ${container.status}`,
          )
          .join("\n"),
      );
    }

    if (operation === "images") {
      const list = await client.images();
      if (wantsJson) {
        return ok(list ?? []);
      }
      if (list === undefined) {
        return ok("Docker unavailable.");
      }
      if (list.length === 0) {
        return ok("No local images.");
      }
      return ok(list.map((image) => `${image.repository}:${image.tag}  ${image.size}`).join("\n"));
    }

    return err("EINVALID_OPERATION", `Unknown docker operation: ${String(operation)}`);
  };

  return { docker };
}

/** Docker command handlers over the real client. */
export const commandHandlers: Record<string, CommandHandler> =
  createCommandHandlers(createDockerClient());
