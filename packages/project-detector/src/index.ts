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
export { createDefaultRegistry } from "./defaults.js";
