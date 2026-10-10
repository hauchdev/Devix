import { Args, Flags } from "@oclif/core";

import { isAbsolute, resolve } from "node:path";

import type { Ui } from "@devix-cli/ui";

import { DevixCommand, devixBaseFlags, field, row } from "../lib/devix-command.js";
import { pluginCommandRegistry } from "../lib/plugin-commands.js";

interface DetectData {
  readonly isWeb: boolean;
  readonly root: string;
  readonly frameworks?: { id: string; label: string; package: string; static: boolean }[];
  readonly message?: string;
}

interface EnvData {
  readonly count: number;
  readonly variables?: { name: string; source: string }[];
  readonly note?: string;
}

interface ScriptsData {
  readonly count: number;
  readonly scripts?: { name: string; command: string }[];
}

interface ServeData {
  readonly directory: string;
  readonly framework: string;
  readonly port: number;
  readonly command: string;
  readonly note?: string;
}

interface BuildData {
  readonly frameworks?: string[];
  readonly command: string;
  readonly alternative?: string;
  readonly note?: string;
}

interface WebDoctorData {
  readonly isWeb: boolean;
  readonly frameworks?: string[];
  readonly checks?: { id: string; name: string; status: string; detail?: string }[];
  readonly message?: string;
}

export default class Web extends DevixCommand {
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
    ...devixBaseFlags,
    port: Flags.integer({
      description: "Port printed by serve (print-only).",
      default: undefined,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Web);

    const cwd = isAbsolute(flags.cwd) ? flags.cwd : resolve(flags.cwd);
    const handler = await pluginCommandRegistry.load("web");
    const result = await handler({
      argv: [args.operation, ...(args.platform === undefined ? [] : [args.platform])],
      flags: { ...flags, cwd, ...(flags.port === undefined ? {} : { port: flags.port }) },
    });

    if (!result.ok) {
      this.error(result.error.message, { exit: 1 });
    }

    if (flags.json) {
      this.log(JSON.stringify(result.data, null, 2));
      return;
    }

    if (flags.quiet) {
      return;
    }

    const ui = this.renderer(flags);

    switch (args.operation) {
      case "detect":
        renderDetect(ui, result.data as DetectData);
        return;
      case "env":
        renderEnv(ui, result.data as EnvData);
        return;
      case "scripts":
        renderScripts(ui, result.data as ScriptsData);
        return;
      case "serve":
        renderServe(ui, result.data as ServeData);
        return;
      case "build":
        renderBuild(ui, result.data as BuildData);
        return;
      case "doctor":
        renderWebDoctor(ui, result.data as WebDoctorData);
        return;
      default:
        this.error(`Unknown operation: ${String(args.operation)}`, { exit: 1 });
    }
  }
}

function renderDetect(ui: Ui, data: DetectData): void {
  ui.title("devix web detect");
  ui.blank();

  if (!data.isWeb) {
    ui.section("Project", (ui) =>
      ui.fields([
        field("Root", data.root),
        field("Frameworks", "none", "muted", data.message ?? "No web framework detected."),
      ]),
    );
    ui.blank();
    return;
  }

  ui.section(
    "Frameworks",
    (ui) => {
      ui.fields([field("Root", data.root)]);
      ui.blank();
      ui.table(
        // The label is what a human reads; the machine id stays in --json.
        ["FRAMEWORK", "OUTPUT", "PROVEN BY"],
        (data.frameworks ?? []).map((framework) =>
          row(
            [framework.label, framework.static ? "static" : "dynamic", framework.package],
            framework.static ? "ok" : "info",
          ),
        ),
      );
    },
    { count: data.frameworks?.length ?? 0 },
  );
  ui.blank();
}

function renderEnv(ui: Ui, data: EnvData): void {
  ui.title("devix web env");
  ui.blank();

  if (data.count === 0) {
    ui.section("Variables", (ui) =>
      ui.fields([field("Declared", "0", "muted", "No .env file in this directory.")]),
    );
    ui.blank();
    ui.note(data.note ?? "Values are never read or shown, only variable names.");
    ui.blank();
    return;
  }

  ui.section(
    "Variables",
    (ui) =>
      ui.table(
        ["VARIABLE", "SOURCE"],
        (data.variables ?? []).map((variable) => row([variable.name, variable.source])),
      ),
    { count: data.count, footer: data.note ?? "Only variable names, never values." },
  );
  ui.blank();
}

function renderScripts(ui: Ui, data: ScriptsData): void {
  ui.title("devix web scripts");
  ui.blank();

  if (data.count === 0) {
    ui.section("Scripts", (ui) =>
      ui.fields([field("Scripts", "none", "muted", "Nothing declared in package.json.")]),
    );
    ui.blank();
    return;
  }

  ui.section(
    "Scripts",
    (ui) =>
      ui.table(
        ["NAME", "COMMAND"],
        (data.scripts ?? []).map((script) => row([script.name, script.command])),
      ),
    { count: data.count },
  );
  ui.blank();
}

function renderServe(ui: Ui, data: ServeData): void {
  ui.title("devix web serve");
  ui.blank();

  ui.section("Target", (ui) =>
    ui.fields([
      field("Output", data.directory),
      field("Framework", data.framework),
      field("Port", String(data.port)),
    ]),
  );

  ui.blank();
  ui.section(
    "Serve it with",
    (ui) => ui.fields([{ label: "Command", value: data.command, status: "info" }]),
    {
      role: "secondary",
      footer: data.note ?? "Print-first: Devix does not start a server for you.",
    },
  );
  ui.blank();
}

function renderBuild(ui: Ui, data: BuildData): void {
  ui.title("devix web build");
  ui.blank();

  if (data.frameworks !== undefined && data.frameworks.length > 0) {
    ui.section("Frameworks", (ui) =>
      ui.fields([field("Frameworks", (data.frameworks ?? []).join(", "))]),
    );
    ui.blank();
  }

  const commands =
    data.alternative === undefined ? [data.command] : [data.command, data.alternative];
  ui.section(
    "Build it with",
    (ui) =>
      ui.fields(
        commands.map((command) => ({ label: "Command", value: command, status: "info" as const })),
      ),
    { role: "secondary", footer: data.note ?? "Build is print-first." },
  );
  ui.blank();
}

function renderWebDoctor(ui: Ui, data: WebDoctorData): void {
  ui.title("devix web doctor");
  ui.blank();

  if (!data.isWeb) {
    ui.section("Frameworks", (ui) =>
      ui.fields([field("Frameworks", "none", "muted", data.message ?? "Nothing to diagnose.")]),
    );
    ui.blank();
    return;
  }

  ui.section("Frameworks", (ui) =>
    ui.fields([field("Frameworks", (data.frameworks ?? []).join(", "))]),
  );
  ui.blank();

  ui.section(
    "Checks",
    (ui) =>
      ui.fields(
        (data.checks ?? []).map((check) =>
          field(check.name, check.detail, check.status === "ok" ? "ok" : "warn"),
        ),
      ),
    { count: data.checks?.length ?? 0 },
  );
  ui.blank();
}
