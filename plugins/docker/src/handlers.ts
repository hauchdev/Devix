import { ok, type CommandHandler } from "@devix-cli/output";

import { dockerAvailability, images, runningContainers } from "./index.js";

const docker: CommandHandler = async ({ argv, flags }) => {
  const operation = argv[0];
  if (operation === "status") {
    const availability = await dockerAvailability();
    if (flags.json) {
      return ok(availability);
    }
    if (!availability.available) {
      return ok(`Docker unavailable: ${availability.reason ?? "unknown"}`);
    }
    return ok(`Docker available: ${availability.version ?? "version unknown"}`);
  }

  if (operation === "ps") {
    const containers = await runningContainers();
    if (flags.json) {
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
    const dockerImages = await images();
    if (flags.json) {
      return ok(dockerImages ?? []);
    }
    if (dockerImages === undefined) {
      return ok("Docker unavailable.");
    }
    if (dockerImages.length === 0) {
      return ok("No local images.");
    }
    return ok(
      dockerImages.map((image) => `${image.repository}:${image.tag}  ${image.size}`).join("\n"),
    );
  }

  return {
    ok: false,
    error: {
      code: "EINVALID_OPERATION",
      message: `Unknown docker operation: ${String(operation)}`,
    },
  };
};

/** Docker command handlers contributed via plugin capabilities. */
export const commandHandlers: Record<string, CommandHandler> = {
  docker,
};
