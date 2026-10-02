import { PluginError, PluginRegistry } from "@devix-cli/core";
import type { PluginManifest } from "@devix-cli/core";
import { DOCKER_PLUGIN_MANIFEST } from "@devix-cli/docker";
import { MINECRAFT_PLUGIN_MANIFEST } from "@devix-cli/minecraft";
import { WEB_PLUGIN_MANIFEST } from "@devix-cli/web";

/** Manifests of the plugins shipped with Devix. */
export const BUILTIN_PLUGIN_MANIFESTS: readonly PluginManifest[] = [
  DOCKER_PLUGIN_MANIFEST,
  MINECRAFT_PLUGIN_MANIFEST,
  WEB_PLUGIN_MANIFEST,
];

/**
 * The registry the CLI ships with: every built-in plugin registered in
 * a deterministic order. Custom plugin installation comes later and
 * will extend this same registry.
 */
export function createPluginRegistry(): PluginRegistry {
  return new PluginRegistry((message) => PluginError.invalid(message));
}
