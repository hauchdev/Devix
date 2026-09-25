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
export { MINECRAFT_PLATFORMS, PLATFORM_IDS, type MinecraftPlatform } from "./catalog.js";
export { scaffold, summarizeScaffold } from "./scaffold.js";
export type { ScaffoldEntry, ScaffoldOptions, ScaffoldResult } from "./scaffold.js";
import type { PluginManifest } from "@devix-cli/core";

/**
 * Manifest of this plugin for the core PluginRegistry: version read
 * from the package manifest so it never drifts from the release.
 */
export const MINECRAFT_PLUGIN_MANIFEST: PluginManifest = {
  id: "minecraft",
  name: "Minecraft",
  version: PLUGIN_VERSION,
  description: "Scaffolds Minecraft mod and plugin projects for eight platforms.",
  commands: ["minecraft"],
};
