import { Args, Command, Flags } from "@oclif/core";

import { isAbsolute, resolve } from "node:path";

import { pluginCommandRegistry } from "../lib/plugin-commands.js";

/** Human-readable rendering of one `web detect` result. */
function renderDetect(data: {
  isWeb: boolean;
  root: string;
  frameworks?: { id: string; label: string; package: string; static: boolean }[];
  message?: string;
}): string[] {
  if (!data.isWeb) {
    return [`Project root: ${data.root}`, "", data.message ?? "No web framework detected."];
  }

  const lines = [`Project root: ${data.root}`, "Frameworks:"];
  for (const framework of data.frameworks ?? []) {
    const kind = framework.static ? "static" : "dynamic";
    lines.push(
      `  ✓ ${framework.id.padEnd(12)}${framework.label} (${kind}, via ${framework.package})`,
    );
  }
  return lines;
}

/** Human-readable rendering of one `web env` result. */
function renderEnv(data: {
  count: number;
  note?: string;
  variables?: { name: string; source: string }[];
}): string[] {
  const lines = [`Environment variables (${String(data.count)}):`];
  if (data.count === 0) {
    lines.push("  (none found — no .env file in this directory)");
  }
  for (const variable of data.variables ?? []) {
    lines.push(`  ${variable.name.padEnd(24)}${variable.source}`);
  }
  lines.push("", data.note ?? "Values are never read or shown, only variable names.");
  return lines;
}

/** Human-readable rendering of one `web scripts` result. */
function renderScripts(data: {
  count: number;
  scripts?: { name: string; command: string }[];
}): string[] {
  const lines = [`Scripts (${String(data.count)}):`];
  if (data.count === 0) {
    lines.push("  (none declared in package.json)");
  }
  for (const script of data.scripts ?? []) {
    lines.push(`  ${script.name.padEnd(12)}${script.command}`);
  }
  return lines;
}

/** Human-readable rendering of one `web serve` result. */
function renderServe(data: {
  directory: string;
  framework: string;
  port: number;
  command: string;
  note?: string;
}): string[] {
  return [
    `Build output: ${data.directory} (${data.framework})`,
    "",
    "Serve it with:",
    `  ${data.command}`,
    "",
    data.note ?? "",
  ];
}

/** Human-readable rendering of one `web build` result. */
function renderBuild(data: {
  frameworks?: string[];
  command: string;
  alternative?: string;
  note?: string;
}): string[] {
  const lines: string[] = [];
  if (data.frameworks !== undefined && data.frameworks.length > 0) {
    lines.push(`Frameworks: ${data.frameworks.join(", ")}`);
  }
  lines.push("", "Build it with:", `  ${data.command}`);
  if (data.alternative !== undefined) {
    lines.push(`  ${data.alternative}`);
  }
  lines.push("", data.note ?? "");
  return lines;
}

/** Human-readable rendering of one `web doctor` result. */
function renderWebDoctor(data: {
  isWeb: boolean;
  frameworks?: string[];
  checks?: { id: string; name: string; status: string; detail?: string }[];
  message?: string;
}): string[] {
  if (!data.isWeb) {
    return [data.message ?? "No web framework detected; nothing to diagnose."];
  }

  const lines = [`Frameworks: ${(data.frameworks ?? []).join(", ")}`, "", "Web:"];
  for (const check of data.checks ?? []) {
    const symbol = check.status === "ok" ? "✓" : "!";
    lines.push(
      `  ${symbol} ${check.name}${check.detail === undefined ? "" : ` — ${check.detail}`}`,
    );
  }
  return lines;
}

export default class Web extends Command {
  static override description =
    "Inspect web projects: detect frameworks, review environment variable names, list scripts and print build/serve commands.";

  static override args = {
    operation: Args.string({
      description: "Operation to run.",
      required: true,
      options: ["detect", "env", "scripts", "serve", "build", "doctor"],
    }),
    platform: Args.string({
      description: "With detect: framework id to report on, e.g. next, astro.",
      required: false,
    }),
  };

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description: "Project directory. Defaults to the current directory.",
      default: async () => process.cwd(),
    }),
    port: Flags.integer({
      description: "Port printed by serve (print-only).",
      default: undefined,
    }),
    run: Flags.boolean({
      description: "Reserved for future execution; build and serve stay print-first.",
      default: false,
    }),
    json: Flags.boolean({
      description: "Output as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Web);

    const cwd = isAbsolute(flags.cwd) ? flags.cwd : resolve(flags.cwd);
    const handler = await pluginCommandRegistry.load("web");
    const result = await handler({
      argv: [args.operation, ...(args.platform === undefined ? [] : [args.platform])],
      flags: {
        ...flags,
        cwd,
        ...(flags.port === undefined ? {} : { port: flags.port }),
      },
    });

    if (!result.ok) {
      this.error(result.error.message, { exit: 1 });
    }

    if (flags.json) {
      this.log(JSON.stringify(result.data, null, 2));
      return;
    }

    switch (args.operation) {
      case "detect":
        this.logLines(renderDetect(result.data as never));
        return;
      case "env":
        this.logLines(renderEnv(result.data as never));
        return;
      case "scripts":
        this.logLines(renderScripts(result.data as never));
        return;
      case "serve":
        this.logLines(renderServe(result.data as never));
        return;
      case "build":
        this.logLines(renderBuild(result.data as never));
        return;
      case "doctor":
        this.logLines(renderWebDoctor(result.data as never));
        return;
      default:
        this.error(`Unknown operation: ${String(args.operation)}`, { exit: 1 });
    }
  }

  private logLines(lines: readonly string[]): void {
    for (const line of lines) {
      if (line.length > 0) {
        this.log(line);
      }
    }
  }
}
