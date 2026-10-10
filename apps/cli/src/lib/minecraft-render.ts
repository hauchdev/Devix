import type { Ui } from "@devix-cli/ui";

import { reportHeader } from "./devix-command.js";

export interface ListData {
  readonly kinds: { readonly id: string; readonly description: string }[];
  readonly platforms: {
    readonly id: string;
    readonly kind: string;
    readonly description: string;
  }[];
  readonly modules: { readonly id: string; readonly name: string }[];
}

export interface CheckData {
  readonly root: string;
  readonly isMinecraft: boolean;
  readonly platforms: {
    readonly id: string;
    readonly name: string;
    readonly detail?: string;
    readonly markers: readonly string[];
  }[];
  readonly requested?: { readonly id: string; readonly detected: boolean };
}

export interface RunData {
  readonly cwd: string;
  readonly platforms: readonly string[];
  readonly command: string;
  readonly windowsCommand?: string;
  readonly warnings: readonly string[];
}

/** Renders the `minecraft list` catalog. */
export function renderMinecraftList(ui: Ui, data: ListData): void {
  reportHeader(
    ui,
    "devix minecraft list",
    "Every project kind, platform and module the scaffolder knows.",
  );

  ui.section(
    "Project kinds",
    (ui) => ui.fields(data.kinds.map((kind) => ({ label: kind.id, value: kind.description }))),
    { count: data.kinds.length },
  );
  ui.blank();

  ui.section(
    "Platforms",
    (ui) =>
      ui.table(
        ["ID", "KIND", "DESCRIPTION"],
        data.platforms.map((platform) => ({
          cells: [platform.id, platform.kind, platform.description],
        })),
      ),
    { count: data.platforms.length },
  );
  ui.blank();

  ui.section(
    "Optional modules",
    (ui) => ui.fields(data.modules.map((module) => ({ label: module.id, value: module.name }))),
    { count: data.modules.length },
  );
  ui.blank();

  ui.hint("devix minecraft init <platforms> <name>");
}

/** Renders the `minecraft check` detection result. */
export function renderMinecraftCheck(ui: Ui, data: CheckData): void {
  reportHeader(ui, "devix minecraft check", "What this directory looks like to the detector.");

  if (!data.isMinecraft) {
    ui.section("Project", (ui) =>
      ui.fields([
        { label: "Root", value: data.root },
        { label: "Platforms", value: "none", status: "muted", hint: "Not a Minecraft project." },
      ]),
    );
    ui.blank();
    return;
  }

  ui.section(
    "Detected platforms",
    (ui) => {
      ui.fields([
        { label: "Root", value: data.root },
        ...data.platforms.map((platform) => ({
          label: platform.id,
          value: platform.detail ?? platform.name,
          status: "ok" as const,
          hint: platform.markers.join(", "),
        })),
      ]);
    },
    { count: data.platforms.length },
  );

  if (data.requested !== undefined) {
    ui.blank();
    ui.section("Requested", (ui) =>
      ui.fields([fieldRequested(data.requested?.id ?? "", data.requested?.detected ?? false)]),
    );
  }

  ui.blank();
}

function fieldRequested(
  id: string,
  detected: boolean,
): {
  label: string;
  value: string;
  status: "ok" | "warn";
  hint: string;
} {
  return detected
    ? { label: `Requested: ${id}`, value: "detected", status: "ok", hint: "" }
    : {
        label: `Requested: ${id}`,
        value: "not detected",
        status: "warn",
        hint: "The project does not use this platform.",
      };
}

/** Renders the `minecraft run` launch plan. */
export function renderMinecraftRun(ui: Ui, data: RunData): void {
  renderTaskPlan(
    ui,
    "devix minecraft run",
    "How to launch this project without Devix starting it for you.",
    "Run with",
    data,
  );
}

/** Renders the `minecraft build` plan. */
export function renderMinecraftBuild(ui: Ui, data: RunData): void {
  renderTaskPlan(
    ui,
    "devix minecraft build",
    "How to build this project without Devix running the build.",
    "Build with",
    data,
  );
}

/** Renders the `minecraft clean` plan. */
export function renderMinecraftClean(ui: Ui, data: RunData): void {
  renderTaskPlan(
    ui,
    "devix minecraft clean",
    "How to remove this project's build output.",
    "Clean with",
    data,
  );
}

/**
 * Renders one Gradle task plan.
 *
 * Run, build and clean differ only in their title and the word before
 * the command, so they share this rather than three near-identical
 * functions that drift apart.
 */
function renderTaskPlan(
  ui: Ui,
  title: string,
  tagline: string,
  label: string,
  data: RunData,
): void {
  reportHeader(ui, title, tagline);

  ui.section("Target", (ui) =>
    ui.fields([
      { label: "Root", value: data.cwd },
      { label: "Platforms", value: data.platforms.join(", ") },
    ]),
  );
  ui.blank();

  ui.section(
    label,
    (ui) =>
      ui.fields(
        data.windowsCommand === undefined
          ? [{ label: "Command", value: data.command, status: "info" }]
          : [
              { label: "Command", value: data.command, status: "info" },
              { label: "Windows", value: data.windowsCommand, status: "info" },
            ],
      ),
    { role: "secondary" },
  );

  if (data.warnings.length > 0) {
    ui.blank();
    ui.section(
      "Notes",
      (ui) =>
        ui.fields(
          data.warnings.map((warning) => ({ label: "", value: warning, status: "warn" as const })),
        ),
      { count: data.warnings.length, role: "warning" },
    );
  }

  ui.blank();
}

/** The doctor report shape the renderer needs. */
export interface DoctorData {
  readonly root: string;
  readonly isMinecraft: boolean;
  readonly platforms: readonly string[];
  readonly buildSystem: string;
  readonly checks: readonly {
    readonly id: string;
    readonly name: string;
    readonly status: "ok" | "warn" | "missing";
    readonly detail?: string;
    readonly hint?: string;
  }[];
}

/** Renders the `minecraft doctor` report. */
export function renderMinecraftDoctor(ui: Ui, data: DoctorData): void {
  reportHeader(
    ui,
    "devix minecraft doctor",
    "Wrapper, Java and version checks for an existing project.",
  );

  if (!data.isMinecraft) {
    ui.section("Project", (ui) =>
      ui.fields([
        { label: "Root", value: data.root },
        { label: "Project", value: "none", status: "warn", hint: "Not a Minecraft project." },
      ]),
    );
    ui.blank();
    return;
  }

  const ready = data.checks.filter((check) => check.status === "ok").length;
  ui.section("Project", (ui) =>
    ui.fields([
      { label: "Root", value: data.root },
      { label: "Platforms", value: data.platforms.join(", ") },
      { label: "Build", value: data.buildSystem },
    ]),
  );
  ui.blank();

  ui.section(
    "Checks",
    (ui) =>
      ui.fields(
        data.checks.map((check) => ({
          label: check.name,
          ...(check.detail !== undefined
            ? { value: check.detail }
            : check.status === "ok"
              ? {}
              : { value: "check failed" }),
          status:
            check.status === "ok"
              ? ("ok" as const)
              : check.status === "warn"
                ? ("warn" as const)
                : ("error" as const),
          ...(check.hint === undefined ? {} : { hint: check.hint }),
        })),
      ),
    {
      count: data.checks.length,
      footer: `${String(ready)} of ${String(data.checks.length)} passing`,
    },
  );
  ui.blank();
}

/** The operations routed through the plugin handler. */
export const MINECRAFT_HANDLED_OPERATIONS: readonly string[] = [
  "list",
  "check",
  "run",
  "build",
  "clean",
];
