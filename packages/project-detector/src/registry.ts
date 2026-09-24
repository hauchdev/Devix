import { ProjectDetectorError } from "./errors.js";
import type { Detector } from "./types.js";

/**
 * Registry of detectors, keyed by stable id.
 *
 * Registration order is preserved for deterministic results.
 */
export class DetectorRegistry {
  private readonly byId = new Map<string, Detector>();
  private readonly order: string[] = [];

  /** Registers a detector; throws on duplicate ids. */
  register(detector: Detector): this {
    if (detector.id.trim().length === 0) {
      throw ProjectDetectorError.invalid("Detector id must be a non-empty string");
    }
    if (this.byId.has(detector.id)) {
      throw ProjectDetectorError.invalid(`Detector id already registered: ${detector.id}`);
    }
    if (detector.markers.length === 0) {
      throw ProjectDetectorError.invalid(
        `Detector must declare at least one marker: ${detector.id}`,
      );
    }
    this.byId.set(detector.id, detector);
    this.order.push(detector.id);
    return this;
  }

  /** Registers multiple detectors in order. */
  registerAll(detectors: readonly Detector[]): this {
    for (const detector of detectors) {
      this.register(detector);
    }
    return this;
  }

  /** Returns a registered detector by id. */
  get(id: string): Detector {
    const detector = this.byId.get(id);
    if (detector === undefined) {
      throw ProjectDetectorError.unknownDetector(id);
    }
    return detector;
  }

  /** Returns true if a detector with the given id is registered. */
  has(id: string): boolean {
    return this.byId.has(id);
  }

  /** Registered detector ids, in registration order. */
  ids(): readonly string[] {
    return [...this.order];
  }

  /** All registered detectors, in registration order. */
  all(): readonly Detector[] {
    return this.order.map((id) => {
      const detector = this.byId.get(id);
      if (detector === undefined) {
        throw ProjectDetectorError.unknownDetector(id);
      }
      return detector;
    });
  }
}
