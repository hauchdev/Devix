/**
 * Core types for the detector architecture.
 *
 * A detector is a self-contained unit with a stable id. Adding a new
 * detector must never require touching existing ones (no giant
 * if/else): implement `Detector` and register it.
 */

/** A marker or evidence found on disk. */
export interface Detection {
  /** Machine-readable marker, e.g. "package.json". */
  readonly marker: string;
  /** Where the marker was found (absolute path). */
  readonly path: string;
  /** Human-readable detail, e.g. a version string. */
  readonly detail?: string;
}

/** A self-contained detector registered under a stable id. */
export interface Detector {
  /** Stable identifier, e.g. "node". */
  readonly id: string;
  /** Display name, e.g. "Node.js". */
  readonly name: string;
  /**
   * Coarse classification used to group detection results in the
   * composed API (e.g. "language", "packageManager", "tool").
   */
  readonly category: string;
  /**
   * The marker names this detector looks for, relative to a directory
   * (used by `findProjectRoot` to delimit the project).
   */
  readonly markers: readonly string[];
  /**
   * Runs the detection in the given project root directory.
   * Implementations must not throw for "not found": they return an
   * empty result. Only exceptional failures throw typed errors.
   */
  detect(context: DetectContext): Promise<DetectionResult>;
}

/** Context passed to every detector run. */
export interface DetectContext {
  /** Absolute path of the project root to inspect. */
  readonly root: string;
}

/** Result of a single detector run. */
export interface DetectionResult {
  /** Whether any marker was found. */
  readonly detected: boolean;
  /** Evidence found, empty when not detected. */
  readonly detections: readonly Detection[];
}

/** Aggregated result of a full project detection. */
export interface ProjectDetection {
  /** Absolute path of the detected project root. */
  readonly root: string;
  /** True when at least one marker was found anywhere. */
  readonly isProject: boolean;
  /** Results per detector id, in registration order. */
  readonly detectors: ReadonlyMap<string, DetectionResult>;
}
