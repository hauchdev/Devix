export { ProjectDetectorError } from "./errors.js";
export type { ProjectDetectorErrorCode } from "./errors.js";

export type {
  DetectContext,
  Detection,
  DetectionResult,
  Detector,
  ProjectDetection,
} from "./types.js";

export { DetectorRegistry } from "./registry.js";
export { findProjectRoot } from "./root.js";
export { detectProject, type DetectProjectOptions } from "./detect.js";

export { summarizeProject } from "./summary.js";
export type { ProjectSummary, SummaryEntry } from "./summary.js";

export { nodeDetector } from "./detectors/node.js";
export { npmDetector } from "./detectors/npm.js";
export { pnpmDetector } from "./detectors/pnpm.js";
export { yarnDetector } from "./detectors/yarn.js";
export { bunDetector } from "./detectors/bun.js";
export { typescriptDetector } from "./detectors/typescript.js";
export { gitDetector } from "./detectors/git.js";
export { dockerDetector } from "./detectors/docker.js";
export { javaDetector } from "./detectors/java.js";
export { rustDetector } from "./detectors/rust.js";
export { pythonDetector } from "./detectors/python.js";
export { fabricDetector } from "./detectors/fabric.js";
export { quiltDetector } from "./detectors/quilt.js";
export { forgeDetector } from "./detectors/forge.js";
export { neoforgeDetector } from "./detectors/neoforge.js";
export { bukkitDetector } from "./detectors/bukkit.js";
export { bungeecordDetector } from "./detectors/bungeecord.js";
export { velocityDetector } from "./detectors/velocity.js";
export { spongeDetector } from "./detectors/sponge.js";
export { createDefaultRegistry, defaultDetectors } from "./defaults.js";
