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
      default: process.cwd(),
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
      this.renderStatus(availability, flags.json);
      return;
    }

    if (!availability.available) {
      this.error(this.unavailableMessage(availability), { exit: 1 });
    }

    if (args.operation === "ps") {
      const containers = await docker.runningContainers();
      this.renderContainers(containers ?? [], flags.json);
      return;
    }

    const list = await docker.images();
    this.renderImages(list ?? [], flags.json);
  }

  private renderStatus(
    availability: { available: boolean; version?: string; reason?: string },
    json: boolean,
  ): void {
    if (json) {
      this.log(JSON.stringify(availability, null, 2));
      return;
    }
    if (availability.available) {
      this.log(`✓ Docker ${availability.version ?? ""}`);
    } else {
      this.log(`✗ Docker unavailable: ${this.unavailableMessage(availability)}`);
    }
  }

  private renderContainers(
    containers: { id: string; image: string; names: string; status: string }[],
    json: boolean,
  ): void {
    if (json) {
      this.log(JSON.stringify(containers, null, 2));
      return;
    }
    if (containers.length === 0) {
      this.log("No running containers.");
      return;
    }
    for (const c of containers) {
      this.log(
        `  ${c.id.slice(0, 12).padEnd(14)}${c.image.padEnd(28)}${c.names.padEnd(24)}${c.status}`,
      );
    }
  }

  private renderImages(
    images: { repository: string; tag: string; size: string }[],
    json: boolean,
  ): void {
    if (json) {
      this.log(JSON.stringify(images, null, 2));
      return;
    }
    if (images.length === 0) {
      this.log("No images.");
      return;
    }
    for (const image of images) {
      this.log(`  ${`${image.repository}:${image.tag}`.padEnd(40)}${image.size}`);
    }
  }

  private unavailableMessage(availability: { reason?: string }): string {
    return availability.reason === "cli-missing"
      ? "the docker CLI is not installed"
      : "the Docker daemon is not running";
  }
}
