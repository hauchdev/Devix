import { MinecraftError } from "../errors.js";
import { renderArchitectury } from "./architectury.js";
import { renderBungeeCord } from "./bungeecord.js";
import { renderFabric } from "./fabric.js";
import { renderFolia } from "./folia.js";
import { renderForge } from "./forge.js";
import { renderPaper } from "./paper.js";
import { renderSpigot } from "./spigot.js";
import { renderVelocity } from "./velocity.js";
import type { PlatformRenderer, TemplateContext, TemplateFile } from "./types.js";

/** One renderer per catalog platform id. */
const RENDERERS: Readonly<Record<string, PlatformRenderer>> = {
  fabric: renderFabric,
  forge: renderForge,
  architectury: renderArchitectury,
  spigot: renderSpigot,
  paper: renderPaper,
  folia: renderFolia,
  velocity: renderVelocity,
  bungeecord: renderBungeeCord,
};

/** Builds the full file list for a platform. */
export function buildTemplates(context: TemplateContext): TemplateFile[] {
  const renderer = RENDERERS[context.platform];
  if (renderer === undefined) {
    throw MinecraftError.unknownPlatform(context.platform, Object.keys(RENDERERS));
  }
  return renderer(context);
}

export type { PlatformRenderer, TemplateContext, TemplateFile } from "./types.js";
export { packageLeaf, packagePath } from "./types.js";
