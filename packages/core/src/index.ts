import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version?: string;
};

/**
 * The Devix version this build of core ships with, read from this
 * package's own manifest so it can never drift from the release.
 */
export const DEVIX_VERSION: string = manifest.version ?? "0.0.0";

export { PluginError } from "./plugin-error.js";
export type { PluginErrorCode } from "./plugin-error.js";
export {
  PluginRegistry,
  type PluginErrorFactory,
  type PluginManifest,
  type RegisteredPlugin,
} from "./plugins.js";
