import { PluginError, PluginRegistry } from "@devix-cli/core";
import type { PluginManifest } from "@devix-cli/core";
import { PLUGIN_VERSION } from "@devix-cli/docker";

/** Manifests of the plugins shipped with Devix. */
export const BUILTIN_PLUGIN_MANIFESTS: readonly PluginManifest[] = [
  {
    id: "docker",
    name: "Docker",
    version: PLUGIN_VERSION,
    description: "Docker diagnostics: availability, containers and images.",
    commands: ["docker"],
  },
];

/**
 * The registry the CLI ships with: every built-in plugin registered in
 * a deterministic order. Custom plugin installation comes later and
 * will extend this same registry.
 */
export function createPluginRegistry(): PluginRegistry {
  return new PluginRegistry((message) => PluginError.invalid(message));
}
