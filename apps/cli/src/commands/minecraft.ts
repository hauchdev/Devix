import { Command, Args, Flags } from "@oclif/core";
import { isAbsolute, join, resolve } from "node:path";

import {
  MINECRAFT_PLATFORMS,
  MinecraftError,
  PLATFORM_IDS,
  scaffold,
  summarizeScaffold,
} from "@devix-cli/minecraft";

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
    "Scaffold Minecraft mod and plugin projects: fabric, forge, architectury, spigot, paper, folia, velocity, bungeecord.";

  static override args = {
    operation: Args.string({
      description: "Operation to run.",
      required: true,
      options: ["list", "init"],
    }),
    platform: Args.string({
      description: `Platform id for init (${PLATFORM_IDS.join(", ")}).`,
      required: false,
    }),
    name: Args.string({
      description: "Project/mod/plugin name for init.",
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

    if (args.platform === undefined || args.name === undefined) {
      this.error("init requires a platform and a name: devix minecraft init <platform> <name>", {
        exit: 1,
      });
    }

    const parent = isAbsolute(flags.cwd) ? flags.cwd : resolve(flags.cwd);
    const root = flags.here ? parent : join(parent, folderName(args.name));

    try {
      const result = await scaffold({
        root,
        platform: args.platform,
        name: args.name,
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
            : `Next steps: cd ${folderName(args.name)} and run your first build.`,
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
  }
}
