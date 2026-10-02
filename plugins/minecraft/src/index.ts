import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version?: string;
};

/**
 * The version of the minecraft plugin, read from this package's own
 * manifest so the advertised plugin version always matches the
 * released package.
 */
export const PLUGIN_VERSION: string = manifest.version ?? "0.0.0";

export { MinecraftError } from "./errors.js";
export type { MinecraftErrorCode } from "./errors.js";
export {
  MINECRAFT_PLATFORMS,
  MINECRAFT_PROJECT_KINDS,
  MINECRAFT_MODULES,
  MODULE_IDS,
  PLATFORM_IDS,
  getModuleKind,
  getPlatform,
  getProjectKind,
  platformsForKind,
  platformsForLoader,
} from "./catalog.js";
export type {
  MinecraftModuleKindInfo,
  MinecraftPlatform,
  MinecraftProjectKind,
  MinecraftProjectKindInfo,
} from "./catalog.js";
export {
  DEFAULT_MINECRAFT_VERSION,
  MINECRAFT_VERSIONS,
  isKnownMinecraftVersion,
  resolveLoaderVersions,
  resolveVersionSpec,
  supportedLoaders,
} from "./versions.js";
export type { MinecraftVersionSpec, ResolvedVersions } from "./versions.js";
export { scaffold, summarizeScaffold } from "./scaffold.js";
export type { ScaffoldEntry, ScaffoldOptions, ScaffoldResult } from "./scaffold.js";
export { planRun, requireMinecraftRun } from "./run.js";
export type { RunPlan } from "./run.js";
export { commandHandlers } from "./handlers.js";
export type { DetectedMinecraftPlatform } from "@devix-cli/project-detector";
import type { PluginManifest } from "@devix-cli/core";

/**
 * Manifest of this plugin for the core PluginRegistry: version read
 * from the package manifest so it never drifts from the release.
 */
export const MINECRAFT_PLUGIN_MANIFEST: PluginManifest = {
  id: "minecraft",
  name: "Minecraft",
  version: PLUGIN_VERSION,
  description:
    "Scaffolds Minecraft projects: mods, plugins and proxies with multi-loader, multi-module and multi-version support.",
  apiVersion: "1",
  capabilities: {
    commands: [
      {
        id: "minecraft",
        description: "Scaffold and inspect Minecraft projects.",
        module: "@devix-cli/minecraft",
        export: "commandHandlers",
      },
    ],
  },
};
