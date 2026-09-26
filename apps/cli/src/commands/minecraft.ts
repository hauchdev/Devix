import { Command, Args, Flags } from "@oclif/core";
import { isAbsolute, join, resolve } from "node:path";

import {
  MINECRAFT_PLATFORMS,
  MinecraftError,
  PLATFORM_IDS,
  scaffold,
  summarizeScaffold,
} from "@devix-cli/minecraft";
import {
  promptMissingScaffoldArgs,
  PromptCancelledError,
  type PromptChoice,
} from "../lib/prompts.js";

/** `Cool Sword!` -> `cool-sword`: a filesystem-friendly folder name. */
function folderName(name: string): string {
  const folder = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return folder.length > 0 ? folder : "project";
}

export default class Minecraft extends Command {
  static override description =
    "Scaffold and inspect Minecraft mod and plugin projects: fabric, forge, architectury, spigot, paper, folia, velocity, bungeecord.";

  static override args = {
    operation: Args.string({
      description: "Operation to run.",
      required: true,
      options: ["list", "init", "check"],
    }),
    platform: Args.string({
      description: `Platform id for init (${PLATFORM_IDS.join(", ")}). Asked interactively when omitted on a TTY.`,
      required: false,
    }),
    name: Args.string({
      description: "Project/mod/plugin name for init. Asked interactively when omitted on a TTY.",
      required: false,
    }),
  };

  static override flags = {
    cwd: Flags.string({
      char: "d",
      description:
        "Parent directory where the project folder is created. Defaults to the current directory.",
      default: process.cwd(),
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
      description: "Target Minecraft version for init.",
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
    json: Flags.boolean({
      description: "Output as JSON.",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Minecraft);

    if (args.operation === "list") {
      this.renderList(flags.json);
      return;
    }

    if (args.operation === "check") {
      await this.runCheck(args.platform, flags.cwd, flags.json);
      return;
    }

    const answers = await this.resolveScaffoldArgs(args.platform, args.name, flags.json);
    const platform = answers.platform;
    const name = answers.name;

    const parent = isAbsolute(flags.cwd) ? flags.cwd : resolve(flags.cwd);
    const root = flags.here ? parent : join(parent, folderName(name));

    try {
      const result = await scaffold({
        root,
        platform,
        name,
        packageName: flags.package,
        version: flags.version,
        minecraftVersion: flags.mc,
        dryRun: flags["dry-run"],
        overwrite: flags.overwrite,
      });

      if (flags.json) {
        this.log(
          JSON.stringify(
            {
              platform: result.platform,
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

      for (const line of summarizeScaffold(result)) {
        this.log(line);
      }
      if (result.dryRun) {
        this.log("");
        this.log("Dry run: nothing was written. Drop --dry-run to create the files.");
      } else {
        this.log("");
        this.log(
          result.root === parent
            ? "Next steps: review the build files and run your first build."
            : `Next steps: cd ${folderName(name)} and run your first build.`,
        );
      }
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
   * Fills in the platform and name left out by the user.
   *
   * Prompts run only on an interactive terminal (choice list plus a
   * free-text question). Piped input never reaches them: oclif v5
   * stuffs piped stdin into the first missing positional arg, so any
   * multi-line value there is normalized to "missing" and rejected
   * with an actionable message instead of hanging or half-scaffolding.
   * With `--json` the answers must come from argv, because prompts
   * would corrupt the machine-readable output.
   */
  private async resolveScaffoldArgs(
    platform: string | undefined,
    name: string | undefined,
    json: boolean,
  ): Promise<{ platform: string; name: string }> {
    // oclif reads piped stdin into missing positional args; a value
    // with line breaks is that leakage, not a user-provided id.
    const cleanPlatform = platform !== undefined && !/\r|\n/.test(platform) ? platform : undefined;
    const cleanName = name !== undefined && !/\r|\n/.test(name) ? name : undefined;

    if (cleanPlatform !== undefined && cleanName !== undefined) {
      return { platform: cleanPlatform, name: cleanName };
    }
    if (json) {
      this.error(
        "--json requires the platform and name as arguments: devix minecraft init <platform> <name> --json",
        { exit: 1 },
      );
    }
    if (process.stdin.isTTY !== true) {
      this.error("init requires a platform and a name: devix minecraft init <platform> <name>", {
        exit: 1,
      });
    }

    const choices: readonly PromptChoice[] = MINECRAFT_PLATFORMS.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
    }));
    try {
      return await promptMissingScaffoldArgs(choices, cleanPlatform, cleanName);
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

  /** Detects the Minecraft platforms of the directory tree at cwd. */
  private async runCheck(platform: string | undefined, cwd: string, json: boolean): Promise<void> {
    if (platform !== undefined && !PLATFORM_IDS.includes(platform)) {
      this.error(MinecraftError.unknownPlatform(platform, PLATFORM_IDS).message, { exit: 1 });
    }

    // Lazy: keep --help/--version free of the detector stack.
    const { createDefaultRegistry, detectMinecraftPlatforms } = await import(
      "@devix-cli/project-detector"
    );

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), {
      cwd: join(cwd),
    });

    if (json) {
      this.log(
        JSON.stringify(
          {
            root: detection.root,
            isMinecraft: detection.isMinecraft,
            platforms: detection.platforms.map((entry) => ({
              id: entry.id,
              name: entry.name,
              detail: entry.detail,
              markers: entry.markers.map((marker) => marker.marker),
            })),
            ...(platform === undefined
              ? {}
              : {
                  requested: {
                    id: platform,
                    detected: detection.platforms.some((entry) => entry.id === platform),
                  },
                }),
          },
          null,
          2,
        ),
      );
      return;
    }

    this.log(`Project root: ${detection.root}`);
    if (!detection.isMinecraft) {
      this.log("No Minecraft platform detected in this directory tree.");
      return;
    }
    for (const entry of detection.platforms) {
      const label = entry.detail === undefined ? entry.name : `${entry.name} (${entry.detail})`;
      this.log(`  ✓ ${entry.id} — ${label}`);
      for (const marker of entry.markers) {
        this.log(`      ${marker.marker}`);
      }
    }
  }

  private renderList(json: boolean): void {
    if (json) {
      this.log(JSON.stringify(MINECRAFT_PLATFORMS, null, 2));
      return;
    }
    this.log("Minecraft platforms available for scaffolding:");
    for (const platform of MINECRAFT_PLATFORMS) {
      this.log(`  ${platform.id.padEnd(14)}${platform.kind.padEnd(14)}${platform.description}`);
    }
    this.log("");
    this.log("Init one with: devix minecraft init <platform> <name> [--dry-run]");
    this.log("Detect an existing one with: devix minecraft check [platform]");
  }
}
