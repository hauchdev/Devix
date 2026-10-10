import { join } from "node:path";

import { DevixCommand, devixBaseFlags, checkField, field } from "../lib/devix-command.js";

export default class Status extends DevixCommand {
  static override description =
    "One glance at your environment, project and repository. Read-only.";

  static override flags = devixBaseFlags;

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

    const ui = this.renderer(flags);
    if (flags.quiet) {
      return;
    }

    this.header(ui, "devix status");

    ui.section("Project", (ui) =>
      ui.fields([
        field("Root", report.project.root),
        ...(report.project.isProject
          ? [
              field("Languages", report.project.languages.join(", ") || "none"),
              field("Managers", report.project.packageManagers.join(", ") || "none"),
              field("Tools", report.project.tools.join(", ") || "none"),
              ...(report.project.minecraft.length > 0
                ? [field("Minecraft", report.project.minecraft.join(", "))]
                : []),
            ]
          : [
              field(
                "Markers",
                "none found",
                "warn",
                "This directory does not look like a project.",
              ),
            ]),
      ]),
    );
    ui.blank();

    ui.section("Environment", (ui) => ui.fields(report.environment.checks.map(checkField)), {
      count: report.environment.checks.length,
    });
    ui.blank();

    ui.section("Git", (ui) => {
      if (sync.ok) {
        const { upstream, ahead, behind } = sync.state;
        const drifted = ahead !== 0 || behind !== 0;
        ui.fields([
          field("Upstream", upstream),
          field(
            "State",
            drifted ? `ahead ${String(ahead)}, behind ${String(behind)}` : "up to date",
            drifted ? "warn" : "ok",
            drifted ? "Local commits are not pushed yet." : undefined,
          ),
        ]);
        if (drifted) {
          ui.blank();
          ui.hint("devix git sync    show the commands to reconcile");
        }
      } else {
        ui.fields([
          field("Upstream", "none", "muted", "No upstream configured, or not a repository."),
        ]);
      }
    });
    ui.blank();

    ui.section("Docker", (ui) =>
      ui.fields([
        field(
          "Status",
          availability.available ? (availability.version ?? "running") : "not available",
          availability.available ? "ok" : "muted",
          availability.available
            ? undefined
            : availability.reason === "cli-missing"
              ? "Docker CLI is not installed."
              : "Docker CLI found, but the daemon is not running.",
        ),
      ]),
    );

    if (availability.available && docker.runningContainers !== undefined) {
      const containers = await docker.runningContainers();
      if (containers !== undefined && containers.length > 0) {
        ui.blank();
        ui.section(
          "Containers",
          (ui) =>
            ui.table(
              ["NAME", "IMAGE", "STATUS"],
              containers.map((container) => ({
                cells: [container.names, container.image, container.status],
                status: "ok" as const,
              })),
            ),
          { count: containers.length },
        );
      }
    }

    ui.blank();
    ui.footnote("devix doctor for the full report");
  }
}
