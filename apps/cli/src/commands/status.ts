import { Command, Flags } from "@oclif/core";
import { join } from "node:path";

export default class Status extends Command {
  static override description =
    "One glance at your environment, project and repository. Read-only.";

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Directory to inspect. Defaults to the current directory.",
      default: process.cwd(),
    }),
    json: Flags.boolean({
      description: "Output everything as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Status);
    const cwd = join(flags.cwd);

    const [{ runDoctor }, git, docker] = await Promise.all([
      import("@devix-cli/doctor"),
      import("@devix-cli/git"),
      import("@devix-cli/docker"),
    ]);

    const [report, sync, availability] = await Promise.all([
      runDoctor({ cwd }),
      git
        .syncState(cwd)
        .then((state) => ({ ok: true as const, state }))
        .catch(() => ({ ok: false as const, state: undefined })),
      docker.dockerAvailability(),
    ]);

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            project: report.project,
            environment: report.environment,
            git: sync.ok ? sync.state : { unavailable: true },
            docker: availability,
          },
          null,
          2,
        ),
      );
      return;
    }

    this.log(`Project: ${report.project.root}`);
    if (report.project.isProject) {
      this.log(`  Languages: ${report.project.languages.join(", ") || "none"}`);
      this.log(`  Package managers: ${report.project.packageManagers.join(", ") || "none"}`);
      this.log(`  Tools: ${report.project.tools.join(", ") || "none"}`);
    } else {
      this.log("  No project markers found.");
    }
    this.log("");

    this.log("Environment:");
    for (const check of report.environment.checks) {
      this.log(
        `  ${check.status === "ok" ? "✓" : "✗"} ${check.name} ${check.detail ?? "(not found)"}`,
      );
    }
    this.log("");

    if (sync.ok) {
      const { upstream, ahead, behind } = sync.state;
      this.log(`Git: ${upstream}`);
      if (ahead === 0 && behind === 0) {
        this.log("  Up to date.");
      } else {
        this.log(`  Ahead ${ahead}, behind ${behind}. Run devix git sync for the commands.`);
      }
    } else {
      this.log("Git: no upstream or not a repository.");
    }
    this.log("");

    this.log(
      availability.available
        ? `Docker: ✓ ${availability.version ?? ""}`
        : `Docker: ✗ ${availability.reason === "cli-missing" ? "CLI not installed" : "daemon not running"}`,
    );
  }
}
