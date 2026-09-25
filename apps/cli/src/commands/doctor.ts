import { Command, Flags } from "@oclif/core";
import { join } from "node:path";

import type { CheckResult } from "@devix/doctor";

export default class Doctor extends Command {
  static override description =
    "Diagnose your environment and project: tool versions, detected stack and health.";

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Directory to inspect. Defaults to the current directory.",
      default: process.cwd(),
    }),
    json: Flags.boolean({
      description: "Output the report as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Doctor);

    // Lazy: keep --help/--version free of the doctor dependency graph.
    const { runDoctor } = await import("@devix/doctor");

    const report = await runDoctor({ cwd: join(flags.cwd) });

    if (flags.json) {
      this.log(JSON.stringify(report, null, 2));
      return;
    }

    this.log(`Project root: ${report.project.root}`);
    this.log("");

    this.log("Environment:");
    for (const check of report.environment.checks) {
      this.log(renderCheck(check));
    }
    this.log("");

    this.log("Project:");
    if (!report.project.isProject) {
      this.log("  No project markers found in this directory tree.");
      return;
    }
    this.log(section("  Languages", report.project.languages));
    this.log(section("  Package managers", report.project.packageManagers));
    this.log(section("  Tools", report.project.tools));

    this.log("");
    const missing = report.environment.checks.filter((c) => c.status !== "ok").length;
    this.log(
      missing === 0
        ? "Status: all environment tools detected."
        : `Status: ${missing} environment tool(s) not found.`,
    );
  }
}

/** Renders one check line: "✓ Node.js 22.20.0" or "✗ pnpm (not found)". */
function renderCheck(check: CheckResult): string {
  const mark = check.status === "ok" ? "✓" : "✗";
  const detail = check.detail === undefined ? "(not found)" : check.detail;
  return `  ${mark} ${check.name} ${detail}`;
}

/** Formats an indented section line, or "none" when empty. */
function section(label: string, values: readonly string[]): string {
  return `${label}: ${values.length > 0 ? values.join(", ") : "none"}`;
}
