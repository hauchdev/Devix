import { MinecraftError } from "../errors.js";
import { renderArchitectury } from "./architectury.js";
import { renderBungeeCord } from "./bungeecord.js";
import { renderFabric } from "./fabric.js";
import { renderFolia } from "./folia.js";
import { renderForge } from "./forge.js";
import { renderNeoForge } from "./neoforge.js";
import { renderPaper } from "./paper.js";
import { renderSpigot } from "./spigot.js";
import { renderVelocity } from "./velocity.js";
import { renderMultiLoader } from "./multiloader.js";
import type { PlatformRenderer, TemplateContext, TemplateFile } from "./types.js";

/** One renderer per catalog platform id. */
const RENDERERS: Readonly<Record<string, PlatformRenderer>> = {
  fabric: renderFabric,
  forge: renderForge,
  neoforge: renderNeoForge,
  architectury: renderArchitectury,
  spigot: renderSpigot,
  paper: renderPaper,
  folia: renderFolia,
  velocity: renderVelocity,
  bungeecord: renderBungeeCord,
};

/**
 * Builds the full file list for a context. Multi-loader combinations
 * (fabric+forge, fabric+neoforge, …) dispatch to the dedicated
 * combined renderer; single platforms go through their own.
 */
export function buildTemplates(context: TemplateContext): TemplateFile[] {
  if (context.platforms.length > 1) {
    return renderMultiLoader(context);
  }
  const renderer = RENDERERS[context.platform];
  if (renderer === undefined) {
    throw MinecraftError.unknownPlatform(context.platform, Object.keys(RENDERERS));
  }
  return renderer(context);
}

export type { PlatformRenderer, TemplateContext, TemplateFile } from "./types.js";
export { packageLeaf, packagePath } from "./types.js";
