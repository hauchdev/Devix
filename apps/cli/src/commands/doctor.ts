import { join } from "node:path";

import { DevixCommand, devixBaseFlags, field, hereFlag, toUiStatus } from "../lib/devix-command.js";

export default class Doctor extends DevixCommand {
  static override description =
    "Diagnose your environment and project: tool versions, detected stack and health.";

  static override flags = { ...devixBaseFlags, here: hereFlag };

  async run(): Promise<void> {
    const { flags } = await this.parse(Doctor);

    // Lazy: keep --help/--version free of the doctor dependency graph.
    const { runDoctor } = await import("@devix-cli/doctor");

    const target = join(flags.cwd);
    const report = await runDoctor(flags.here ? { root: target } : { cwd: target });

    if (flags.json) {
      this.log(JSON.stringify(report, null, 2));
      return;
    }

    const ui = this.renderer(flags);
    if (flags.quiet) {
      return;
    }

    ui.title("devix doctor");
    ui.blank();

    ui.heading("Environment", { count: report.environment.checks.length });
    ui.fields(
      report.environment.checks.map((check) =>
        field(
          check.name,
          check.detail,
          toUiStatus(check.status),
          check.status === "missing" ? "Not found on PATH." : undefined,
        ),
      ),
    );
    ui.blank();

    ui.heading("Project");
    if (!report.project.isProject) {
      ui.fields([
        field("Markers", "none", "warn", `Nothing recognized under ${report.project.root}`),
      ]);
    } else {
      ui.fields([
        field("Root", report.project.root),
        field("Languages", report.project.languages.join(", ") || "none"),
        field("Managers", report.project.packageManagers.join(", ") || "none"),
        field("Tools", report.project.tools.join(", ") || "none"),
        ...(report.project.minecraft.length > 0
          ? [field("Minecraft", report.project.minecraft.join(", "))]
          : []),
      ]);
    }

    const missing = report.environment.checks.filter((check) => check.status !== "ok");

    ui.blank();
    ui.divider();
    if (missing.length === 0) {
      ui.line(`  ${ui.style.success(ui.symbols.success)}  Every environment tool was found.`);
    } else {
      ui.line(
        `  ${ui.style.warn(ui.symbols.warn)}  ${String(missing.length)} tool(s) not found: ${missing
          .map((check) => check.name)
          .join(", ")}`,
      );
      ui.blank();
      ui.hint("Devix degrades gracefully: missing tools become warnings, not failures.");
    }
    ui.blank();
  }
}
