export { detectPackageManager, lockfileFor, type PackageManager } from "./detect.js";
export { DepsError } from "./errors.js";
export type { DepsErrorCode } from "./errors.js";
export { defaultDepsRunner, runDepsCommand, type CommandOutput, type DepsRunner } from "./run.js";
