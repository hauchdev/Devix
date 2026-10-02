import { readFileSync } from "node:fs";

import type { PluginManifest } from "@devix-cli/core";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version?: string;
};

/** The version of the web plugin, read from its own package manifest. */
export const PLUGIN_VERSION: string = manifest.version ?? "0.0.0";

/** Manifest of the web plugin for the CLI registry. */
export const WEB_PLUGIN_MANIFEST: PluginManifest = {
  id: "web",
  name: "Web",
  version: PLUGIN_VERSION,
  description:
    "Web project integration: detect frameworks, inspect environment variables, list scripts and print build/serve commands.",
  apiVersion: "1",
  capabilities: {
    commands: [
      {
        id: "web",
        description: "Inspect and run tasks on web projects.",
        module: "@devix-cli/web",
        export: "commandHandlers",
      },
    ],
  },
};

export {
  DEFAULT_SERVE_PORT,
  WebError,
  detectWebProject,
  findStaticOutput,
  listEnvVariables,
  listScripts,
} from "./service.js";
export type { WebBuildOutput, WebEnvVariable, WebProjectOptions, WebScript } from "./service.js";

export { serveStatic, type ServeStaticOptions, type StaticServer } from "./serve.js";

export { commandHandlers } from "./handlers.js";
