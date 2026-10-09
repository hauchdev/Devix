import { createDefaultRegistry, detectMinecraftPlatforms } from "@devix-cli/project-detector";
import { err, ok, type CommandHandler } from "@devix-cli/output";

import {
  MINECRAFT_MODULES,
  MINECRAFT_PLATFORMS,
  MINECRAFT_PROJECT_KINDS,
  PLATFORM_IDS,
} from "./catalog.js";
import { planBuild, planClean, planRun } from "./run.js";

function listHandler(): CommandHandler {
  return async () => {
    return ok({
      kinds: MINECRAFT_PROJECT_KINDS,
      platforms: MINECRAFT_PLATFORMS,
      modules: MINECRAFT_MODULES,
    });
  };
}

function checkHandler(): CommandHandler {
  return async ({ argv }) => {
    const platform = argv[0];
    if (platform !== undefined && !PLATFORM_IDS.includes(platform)) {
      return err("EUNKNOWN_PLATFORM", `Unknown platform: ${platform}`);
    }

    const detection = await detectMinecraftPlatforms(createDefaultRegistry(), {
      cwd: process.cwd(),
    });

    return ok({
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
    });
  };
}

function runHandler(): CommandHandler {
  return async ({ flags }) => {
    const cwd = typeof flags.cwd === "string" ? flags.cwd : process.cwd();
    const plan = await planRun(cwd);
    if (!plan.isMinecraft) {
      return err("ENOT_MINECRAFT", plan.warnings[0] ?? "Not a Minecraft project.");
    }
    return ok({
      cwd: plan.cwd,
      platforms: plan.platforms,
      command: plan.command,
      windowsCommand: plan.windowsCommand,
      warnings: plan.warnings,
    });
  };
}

function unknownSubcommand(subcommand: string | undefined) {
  return err("EUNKNOWN_SUBCOMMAND", `Unknown minecraft subcommand: ${String(subcommand)}`);
}

/** Plans how to build the project; the CLI prints the command. */
function buildHandler(): CommandHandler {
  return async ({ flags }) => {
    const cwd = typeof flags.cwd === "string" ? flags.cwd : process.cwd();
    const plan = await planBuild(cwd);
    if (!plan.isMinecraft) {
      return err("ENOT_MINECRAFT", plan.warnings[0] ?? "Not a Minecraft project.");
    }
    return ok({
      cwd: plan.cwd,
      platforms: plan.platforms,
      command: plan.command,
      windowsCommand: plan.windowsCommand,
      warnings: plan.warnings,
    });
  };
}

/** Plans how to clean the project; the CLI prints the command. */
function cleanHandler(): CommandHandler {
  return async ({ flags }) => {
    const cwd = typeof flags.cwd === "string" ? flags.cwd : process.cwd();
    const plan = await planClean(cwd);
    if (!plan.isMinecraft) {
      return err("ENOT_MINECRAFT", plan.warnings[0] ?? "Not a Minecraft project.");
    }
    return ok({
      cwd: plan.cwd,
      platforms: plan.platforms,
      command: plan.command,
      windowsCommand: plan.windowsCommand,
      warnings: plan.warnings,
    });
  };
}

/** Minecraft command handlers contributed via plugin capabilities. */
export const commandHandlers: Record<string, CommandHandler> = {
  minecraft: async (context) => {
    const subcommand = context.argv[0];
    const rest = context.argv.slice(1);
    switch (subcommand) {
      case "list":
        return listHandler()({ ...context, argv: rest });
      case "check":
        return checkHandler()({ ...context, argv: rest });
      case "run":
        return runHandler()({ ...context, argv: rest });
      case "build":
        return buildHandler()({ ...context, argv: rest });
      case "clean":
        return cleanHandler()({ ...context, argv: rest });
      default:
        return unknownSubcommand(subcommand);
    }
  },
};
