import { bunDetector } from "./detectors/bun.js";
import { dockerDetector } from "./detectors/docker.js";
import { gitDetector } from "./detectors/git.js";
import { javaDetector } from "./detectors/java.js";
import { nodeDetector } from "./detectors/node.js";
import { npmDetector } from "./detectors/npm.js";
import { pnpmDetector } from "./detectors/pnpm.js";
import { pythonDetector } from "./detectors/python.js";
import { rustDetector } from "./detectors/rust.js";
import { typescriptDetector } from "./detectors/typescript.js";
import { yarnDetector } from "./detectors/yarn.js";
import { DetectorRegistry } from "./registry.js";

/**
 * All built-in detectors, in a deterministic order: language first
 * (node, typescript, java, rust, python), then package managers
 * (npm, pnpm, yarn, bun), then tooling (git, docker).
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
