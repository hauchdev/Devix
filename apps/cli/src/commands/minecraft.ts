import { Args, Flags } from "@oclif/core";
import { isAbsolute, join, resolve } from "node:path";

import {
  getPlatform,
  MINECRAFT_MODULES,
  MINECRAFT_PLATFORMS,
  MINECRAFT_PROJECT_KINDS,
  MinecraftError,
  MODULE_IDS,
  PLATFORM_IDS,
  scaffold,
} from "@devix-cli/minecraft";
import { pluginCommandRegistry } from "../lib/plugin-commands.js";
import { DevixCommand, devixBaseFlags, field } from "../lib/devix-command.js";
import {
  MINECRAFT_HANDLED_OPERATIONS,
  renderMinecraftCheck,
  renderMinecraftList,
  renderMinecraftRun,
  type CheckData,
  type ListData,
  type RunData,
} from "../lib/minecraft-render.js";
import { promptScaffoldSpec, PromptCancelledError, type PromptChoice } from "../lib/prompts.js";

/** `Cool Sword!` -> `cool-sword`: a filesystem-friendly folder name. */
function folderName(name: string): string {
  const folder = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return folder.length > 0 ? folder : "project";
}

/** Splits a `--modules api,core` style list. */
function parseList(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const items = value
    .split(/[+,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items;
}

export default class Minecraft extends DevixCommand {
  static override description =
    "Scaffold and inspect Minecraft projects: mods (fabric, forge, neoforge, architectury), plugins (paper, folia, spigot) and proxies (velocity, bungeecord) — with multi-loader, multi-module and multi-version support.";

  static override args = {
    operation: Args.string({
      description: "Operation to run.",
      required: true,
      options: ["list", "init", "check", "run"],
    }),
    kind: Args.string({
      description:
        "With init and no --kind flag: platform id(s) (fabric, fabric+forge) or a kind id (mod, plugin, proxy-plugin) that resolves to its default platform.",
      required: false,
    }),
    name: Args.string({
      description: "Project/mod/plugin name for init. Asked interactively when omitted on a TTY.",
      required: false,
    }),
  };

  static override flags = {
    ...devixBaseFlags,
    kind: Flags.string({
      description:
        "Project kind for init (mod, plugin, proxy-plugin); resolves the default platform.",
      default: undefined,
    }),
    modules: Flags.string({
      description: `Comma/plus separated extra modules for init (${MODULE_IDS.join(", ")}); any module makes the project multi-module.`,
      default: undefined,
    }),
    here: Flags.boolean({
      description:
        "Scaffold directly into the target directory instead of creating a project subfolder.",
      default: false,
    }),
    package: Flags.string({
      description: "Java package for init, e.g. com.example.mymod.",
      default: undefined,
    }),
    version: Flags.string({
      description: "Project version for init.",
      default: undefined,
    }),
    mc: Flags.string({
      description:
        "Target Minecraft version for init: a version (26.3, 1.21.1) or alias (stable, legacy).",
      default: undefined,
    }),
    "dry-run": Flags.boolean({
      description: "List the files that would be written without writing anything.",
      default: false,
    }),
    overwrite: Flags.boolean({
      description:
        "Allow initializing into a directory that already contains template files (existing files are skipped, never overwritten).",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Minecraft);

    if (MINECRAFT_HANDLED_OPERATIONS.includes(args.operation)) {
      const handler = await pluginCommandRegistry.load("minecraft");
      const result = await handler({
        argv: [args.operation, ...(args.kind === undefined ? [] : [args.kind])],
        flags,
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

      if (args.operation === "list") {
        renderMinecraftList(ui, result.data as ListData);
        return;
      }

      if (args.operation === "check") {
        renderMinecraftCheck(ui, result.data as CheckData);
        return;
      }

      renderMinecraftRun(ui, result.data as RunData);
      return;
    }

    const spec = await this.resolveScaffoldSpec(
      {
        ...(args.kind === undefined ? {} : { platformOrKind: args.kind }),
        ...(args.name === undefined ? {} : { name: args.name }),
      },
      flags,
    );
    const platformArg = spec.platforms.join("+");
    const name = spec.name;
    const kindOnly = spec.platforms.length === 0;

    const parent = isAbsolute(flags.cwd) ? flags.cwd : resolve(flags.cwd);
    const root = flags.here ? parent : join(parent, folderName(name));

    try {
      const result = await scaffold({
        root,
        name,
        ...(kindOnly
          ? { kind: spec.kind as "mod" | "plugin" | "proxy-plugin" }
          : { platform: platformArg }),
        ...(spec.packageName === undefined ? {} : { packageName: spec.packageName }),
        ...(spec.version === undefined ? {} : { version: spec.version }),
        ...(spec.minecraftVersion === undefined ? {} : { minecraftVersion: spec.minecraftVersion }),
        modules: spec.modules,
        dryRun: flags["dry-run"],
        overwrite: flags.overwrite,
      });

      if (flags.json) {
        this.log(
          JSON.stringify(
            {
              kind: result.kind,
              platforms: result.platforms,
              name: result.name,
              minecraftVersion: result.minecraftVersion,
              javaVersion: result.javaVersion,
              modules: result.modules,
              root: result.root,
              dryRun: result.dryRun,
              files: result.files,
            },
            null,
            2,
          ),
        );
        return;
      }

      if (flags.quiet) {
        return;
      }

      const ui = this.renderer(flags);
      const written = result.files.filter((entry) => !entry.skipped).length;
      const skipped = result.files.length - written;

      ui.title(result.dryRun ? "devix minecraft init — dry run" : "devix minecraft init");
      ui.blank();

      ui.fields([
        field("Name", result.name),
        field("Kind", result.kind),
        field("Platforms", result.platforms.join(" + ")),
        field("Minecraft", result.minecraftVersion),
        field("Java", String(result.javaVersion)),
        ...(result.modules.length > 1 ? [field("Modules", result.modules.join(", "))] : []),
        field("Root", result.root),
        field(
          "Files",
          `${String(written)} written${skipped > 0 ? `, ${String(skipped)} skipped` : ""}`,
          "ok",
        ),
      ]);

      for (const note of result.targetPlatforms) {
        ui.blank();
        ui.hint(
          `Target already looks like a ${note.name} project${note.detail === undefined ? "" : ` (${note.detail})`}`,
        );
      }

      if (result.dryRun) {
        ui.blank();
        ui.hint("Nothing was written. Drop --dry-run to create the files.");
      } else {
        ui.blank();
        ui.hint(
          result.root === parent
            ? "Review the build files, then run your first build."
            : `cd ${folderName(name)} and run your first build.`,
        );
      }

      ui.blank();
    } catch (error) {
      if (error instanceof MinecraftError) {
        this.error(error.message, { exit: 1 });
      }
      if (error instanceof Error) {
        this.error(error.message, { exit: 1 });
      }
      this.error(String(error), { exit: 1 });
    }
  }

  /**
   * Builds the full scaffold spec from argv plus the interactive
   * prompts (kind -> platforms -> modules -> name -> versions).
   *
   * Prompts run only on an interactive terminal. Piped input never
   * reaches them: oclif v5 stuffs piped stdin into the first missing
   * positional arg, so any multi-line value there is normalized to
   * "missing" and rejected with an actionable message instead of
   * hanging or half-scaffolding. With `--json` the answers must come
   * from argv, because prompts would corrupt the machine-readable
   * output.
   */
  private async resolveScaffoldSpec(
    args: { platformOrKind?: string; name?: string },
    flags: {
      kind?: string;
      modules?: string;
      package?: string;
      version?: string;
      mc?: string;
      json: boolean;
    },
  ): Promise<{
    kind: string;
    platforms: string[];
    modules: string[];
    name: string;
    version?: string;
    minecraftVersion?: string;
    packageName?: string;
  }> {
    // oclif reads piped stdin into missing positional args; a value
    // with line breaks is that leakage, not a user-provided id.
    const cleanFirst =
      args.platformOrKind !== undefined && !/\r|\n/.test(args.platformOrKind)
        ? args.platformOrKind
        : undefined;
    const cleanName = args.name !== undefined && !/\r|\n/.test(args.name) ? args.name : undefined;

    const flagKind = this.normalizeKind(flags.kind);
    const firstIsKindId =
      cleanFirst !== undefined &&
      MINECRAFT_PROJECT_KINDS.some((entry) => entry.id === cleanFirst.trim().toLowerCase());

    // With --kind the first positional carries the project name (the
    // platform is the kind's default); otherwise it is the platform
    // list or a kind id.
    let name = cleanName;
    let firstToken = cleanFirst;
    if (
      flagKind !== undefined &&
      name === undefined &&
      firstToken !== undefined &&
      !firstIsKindId
    ) {
      name = firstToken;
      firstToken = undefined;
    }

    const firstIsKind = firstToken !== undefined && flagKind === undefined && firstIsKindId;
    const kind = firstIsKind ? this.normalizeKind(firstToken) : flagKind;
    const requestedPlatforms =
      firstIsKind || kind !== undefined ? [] : (parseList(firstToken) ?? []);
    const requestedModules = parseList(flags.modules) ?? [];

    const platformIds = this.normalizePlatforms(requestedPlatforms);

    // Everything answered from argv: no prompts at all. The kind is
    // derived from the primary platform when it was not given.
    if (name !== undefined && (platformIds.length > 0 || kind !== undefined)) {
      return {
        kind:
          kind ??
          getPlatform(platformIds[0] ?? "")?.kind ??
          MINECRAFT_PROJECT_KINDS[0]?.id ??
          "mod",
        platforms: platformIds,
        modules: requestedModules,
        name,
        ...(flags.version === undefined ? {} : { version: flags.version }),
        ...(flags.mc === undefined ? {} : { minecraftVersion: flags.mc }),
        ...(flags.package === undefined ? {} : { packageName: flags.package }),
      };
    }
    if (flags.json) {
      this.error(
        "--json requires the platform (or --kind) and the name as arguments: devix minecraft init <platform> <name> --json",
        { exit: 1 },
      );
    }
    if (process.stdin.isTTY !== true && cleanName === undefined) {
      this.error(
        "init requires a platform and a name: devix minecraft init <platform> <name> (or run it on a TTY to answer the prompts)",
        { exit: 1 },
      );
    }

    const kindChoices: readonly PromptChoice[] = MINECRAFT_PROJECT_KINDS.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
    }));
    const platformsByKind: Record<string, readonly PromptChoice[]> = {};
    for (const kindInfo of MINECRAFT_PROJECT_KINDS) {
      platformsByKind[kindInfo.id] = MINECRAFT_PLATFORMS.filter(
        (platform) => platform.kind === kindInfo.id,
      ).map((platform) => ({
        id: platform.id,
        name: platform.name,
        description: platform.description,
      }));
    }
    const modulesByKind: Record<string, readonly PromptChoice[]> = {};
    for (const kindInfo of MINECRAFT_PROJECT_KINDS) {
      modulesByKind[kindInfo.id] = MINECRAFT_MODULES.filter((module) =>
        module.kinds.includes(kindInfo.id),
      ).map((module) => ({
        id: module.id,
        name: module.name,
        description: module.description,
      }));
    }

    try {
      const spec = await promptScaffoldSpec(kindChoices, platformsByKind, modulesByKind, {
        ...(kind === undefined ? {} : { kind }),
        ...(platformIds.length > 0 ? { platforms: platformIds } : {}),
        ...(requestedModules.length > 0 ? { modules: requestedModules } : {}),
        ...(cleanName === undefined ? {} : { name: cleanName }),
        ...(flags.version === undefined ? {} : { version: flags.version }),
        ...(flags.mc === undefined ? {} : { minecraftVersion: flags.mc }),
        ...(flags.package === undefined ? {} : { packageName: flags.package }),
      });
      return {
        kind: spec.kind,
        platforms: spec.platforms,
        modules: spec.modules,
        name: spec.name,
        ...(spec.version === undefined ? {} : { version: spec.version }),
        ...(spec.minecraftVersion === undefined ? {} : { minecraftVersion: spec.minecraftVersion }),
        ...(spec.packageName === undefined ? {} : { packageName: spec.packageName }),
      };
    } catch (error) {
      if (error instanceof PromptCancelledError) {
        this.error(
          "No project created: answer the prompts (or pass the platform and name as arguments).",
          { exit: 1 },
        );
      }
      throw error;
    }
  }

  /** Validates a --kind value against the catalog. */
  private normalizeKind(kind: string | undefined): string | undefined {
    if (kind === undefined) {
      return undefined;
    }
    const normalized = kind.trim().toLowerCase();
    if (!MINECRAFT_PROJECT_KINDS.some((entry: { id: string }) => entry.id === normalized)) {
      this.error(
        `Unknown kind: ${kind}. Known kinds: ${MINECRAFT_PROJECT_KINDS.map(
          (entry: { id: string }) => entry.id,
        ).join(", ")}.`,
        { exit: 1 },
      );
    }
    return normalized;
  }

  /** Validates platform ids (and combinations) against the catalog. */
  private normalizePlatforms(platforms: readonly string[]): string[] {
    const ids: string[] = [];
    for (const platform of platforms) {
      if (!PLATFORM_IDS.includes(platform)) {
        this.error(MinecraftError.unknownPlatform(platform, PLATFORM_IDS).message, { exit: 1 });
      }
      if (!ids.includes(platform)) {
        ids.push(platform);
      }
    }
    return ids;
  }
}
