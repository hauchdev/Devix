import { Command, Args, Flags } from "@oclif/core";
import { join } from "node:path";

export default class Docker extends Command {
  static override description =
    "Docker diagnostics that degrade gracefully when Docker is not installed.";

  static override args = {
    operation: Args.string({
      description: "Docker operation to run.",
      required: true,
      options: ["status", "ps", "images"],
    }),
  };

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Project directory (reserved for compose detection). Defaults to cwd.",
      default: async () => process.cwd(),
    }),
    json: Flags.boolean({
      description: "Output as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Docker);
    void join(flags.cwd);

    const docker = await import("@devix-cli/docker");
    const availability = await docker.dockerAvailability();

    if (args.operation === "status") {
      if (flags.json) {
        this.log(JSON.stringify(availability, null, 2));
        return;
      }
      if (!availability.available) {
        this.log(`Docker unavailable: ${availability.reason ?? "unknown"}`);
        return;
      }
      this.log(`Docker available: ${availability.version ?? "version unknown"}`);
      return;
    }

    if (args.operation === "ps") {
      const containers = await docker.runningContainers();
      if (flags.json) {
        this.log(JSON.stringify(containers ?? [], null, 2));
        return;
      }
      if (containers === undefined) {
        this.log("Docker unavailable.");
        return;
      }
      if (containers.length === 0) {
        this.log("No running containers.");
        return;
      }
      for (const container of containers) {
        this.log(`${container.id}  ${container.image}  ${container.names}  ${container.status}`);
      }
      return;
    }

    // images
    const images = await docker.images();
    if (flags.json) {
      this.log(JSON.stringify(images ?? [], null, 2));
      return;
    }
    if (images === undefined) {
      this.log("Docker unavailable.");
      return;
    }
    if (images.length === 0) {
      this.log("No local images.");
      return;
    }
    for (const image of images) {
      this.log(`${image.repository}:${image.tag}  ${image.size}`);
    }
  }
}
