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
