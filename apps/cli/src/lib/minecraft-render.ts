import { Args } from "@oclif/core";

import type { Ui } from "@devix-cli/ui";

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
  ui.title("devix minecraft list");
  ui.blank();

  ui.heading("Project kinds", { count: data.kinds.length });
  ui.fields(data.kinds.map((kind) => ({ label: kind.id, value: kind.description })));
  ui.blank();

  ui.heading("Platforms", { count: data.platforms.length });
  ui.table(
    ["ID", "KIND", "DESCRIPTION"],
    data.platforms.map((platform) => ({
      cells: [platform.id, platform.kind, platform.description],
    })),
  );
  ui.blank();

  ui.heading("Optional modules", { count: data.modules.length });
  ui.fields(data.modules.map((module) => ({ label: module.id, value: module.name })));
  ui.blank();

  ui.hint("devix minecraft init <platforms> <name>");
}

/** Renders the `minecraft check` detection result. */
export function renderMinecraftCheck(ui: Ui, data: CheckData): void {
  ui.title("devix minecraft check");
  ui.blank();

  if (!data.isMinecraft) {
    ui.fields([
      { label: "Root", value: data.root },
      { label: "Platforms", value: "none", status: "muted", hint: "Not a Minecraft project." },
    ]);
    ui.blank();
    return;
  }

  ui.fields([{ label: "Root", value: data.root }]);
  ui.blank();

  ui.heading("Detected platforms", { count: data.platforms.length });
  ui.fields(
    data.platforms.map((platform) => ({
      label: platform.id,
      value: platform.detail ?? platform.name,
      status: "ok" as const,
      hint: platform.markers.join(", "),
    })),
  );

  if (data.requested !== undefined) {
    ui.blank();
    ui.fields([fieldRequested(data.requested.id, data.requested.detected)]);
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
  ui.title("devix minecraft run");
  ui.blank();

  ui.fields([
    { label: "Root", value: data.cwd },
    { label: "Platforms", value: data.platforms.join(", ") },
  ]);
  ui.blank();

  ui.panel(
    "Run with",
    data.windowsCommand === undefined
      ? [data.command]
      : [data.command, `${data.windowsCommand}   (Windows)`],
    { status: "info" },
  );

  if (data.warnings.length > 0) {
    ui.blank();
    ui.heading("Notes", { count: data.warnings.length });
    for (const warning of data.warnings) {
      ui.line(`  ${ui.style.muted(ui.symbols.arrow)} ${ui.style.muted(warning)}`);
    }
  }

  ui.blank();
}

/** The operations routed through the plugin handler. */
export const MINECRAFT_HANDLED_OPERATIONS: readonly string[] = ["list", "check", "run"];

/** Arg definition shared by the routed operations. */
export const handledOperationArg = Args.string({
  description: "Operation to run.",
  required: false,
});
