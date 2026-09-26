import { detectProject } from "./detect.js";
import type { DetectorRegistry } from "./registry.js";
import type { Detection } from "./types.js";

/** One Minecraft platform found in a directory. */
export interface DetectedMinecraftPlatform {
  /** Detector id, e.g. "fabric". */
  readonly id: string;
  /** Display name, e.g. "Fabric". */
  readonly name: string;
  /** Manifest detail (mod or plugin id/name), when the manifest was readable. */
  readonly detail?: string;
  /** Marker evidence found on disk, in detector marker order. */
  readonly markers: readonly Detection[];
}

/** Result of a Minecraft platform detection. */
export interface MinecraftDetection {
  /** Absolute path of the detected project root (nearest marker wins). */
  readonly root: string;
  /** Detected platforms, in registration order. Empty when none. */
  readonly platforms: readonly DetectedMinecraftPlatform[];
  /** True when at least one Minecraft platform was detected. */
  readonly isMinecraft: boolean;
}

/** Options accepted by `detectMinecraftPlatforms`. */
export interface MinecraftDetectionOptions {
  /** Directory where the upward search starts. Defaults to `process.cwd()`. */
  readonly cwd?: string;
}

/**
 * Detects the Minecraft mod/plugin platforms of a project, composed on
 * top of `detectProject`: every registered detector in the
 * `minecraft` category that found markers becomes an entry, keeping
 * registration order.
 *
 * "No Minecraft project" is not an error: the result simply has an
 * empty `platforms` list and `isMinecraft: false`.
 */
export async function detectMinecraftPlatforms(
  registry: DetectorRegistry,
  options: MinecraftDetectionOptions = {},
): Promise<MinecraftDetection> {
  const detection = await detectProject(
    registry,
    options.cwd === undefined ? {} : { cwd: options.cwd },
  );

  const platforms: DetectedMinecraftPlatform[] = [];
  for (const detector of registry.all()) {
    if (detector.category !== "minecraft") {
      continue;
    }
    const result = detection.detectors.get(detector.id);
    if (result === undefined || !result.detected) {
      continue;
    }
    const primary = result.detections[0];
    platforms.push({
      id: detector.id,
      name: detector.name,
      ...(primary?.detail === undefined ? {} : { detail: primary.detail }),
      markers: result.detections,
    });
  }

  return { root: detection.root, platforms, isMinecraft: platforms.length > 0 };
}
