import { bukkitDetector } from "./detectors/bukkit.js";
import { bungeecordDetector } from "./detectors/bungeecord.js";
import { bunDetector } from "./detectors/bun.js";
import { dockerDetector } from "./detectors/docker.js";
import { fabricDetector } from "./detectors/fabric.js";
import { forgeDetector } from "./detectors/forge.js";
import { gitDetector } from "./detectors/git.js";
import { javaDetector } from "./detectors/java.js";
import { neoforgeDetector } from "./detectors/neoforge.js";
import { nodeDetector } from "./detectors/node.js";
import { npmDetector } from "./detectors/npm.js";
import { pnpmDetector } from "./detectors/pnpm.js";
import { pythonDetector } from "./detectors/python.js";
import { quiltDetector } from "./detectors/quilt.js";
import { rustDetector } from "./detectors/rust.js";
import { spongeDetector } from "./detectors/sponge.js";
import { typescriptDetector } from "./detectors/typescript.js";
import { velocityDetector } from "./detectors/velocity.js";
import { yarnDetector } from "./detectors/yarn.js";
import { DetectorRegistry } from "./registry.js";

/**
 * All built-in detectors, in a deterministic order: language first
 * (node, typescript, java, rust, python), then package managers
 * (npm, pnpm, yarn, bun), then tooling (git, docker), then Minecraft
 * server/mod platforms (fabric, quilt, forge, neoforge, bukkit,
 * bungeecord, velocity, sponge).
 */
export const defaultDetectors: readonly import("./types.js").Detector[] = [
  nodeDetector,
  typescriptDetector,
  javaDetector,
  rustDetector,
  pythonDetector,
  npmDetector,
  pnpmDetector,
  yarnDetector,
  bunDetector,
  gitDetector,
  dockerDetector,
  fabricDetector,
  quiltDetector,
  forgeDetector,
  neoforgeDetector,
  bukkitDetector,
  bungeecordDetector,
  velocityDetector,
  spongeDetector,
];

/**
 * Creates a registry preloaded with all built-in detectors.
 *
 * Callers can keep adding their own detectors on top: the returned
 * registry is a normal `DetectorRegistry`.
 */
export function createDefaultRegistry(): DetectorRegistry {
  return new DetectorRegistry().registerAll(defaultDetectors);
}
