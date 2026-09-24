import { isDirectory, isFile, walkUp } from "@devix/filesystem";
import { join } from "node:path";

import type { Detector } from "./types.js";

/**
 * Finds the project root starting at `startDir`.
 *
 * Walks upward and stops at the nearest directory containing any
 * marker declared by any detector. The starting directory itself is
 * considered first. If no marker is found anywhere, returns the
 * starting directory: callers treat that as "not a project".
 */
export async function findProjectRoot(
  startDir: string,
  detectors: readonly Detector[],
): Promise<string> {
  const markers = collectMarkers(detectors);

  for await (const dir of walkUp(startDir)) {
    for (const marker of markers) {
      const candidate = join(dir, marker);
      if (await isMarker(candidate)) {
        return dir;
      }
    }
  }

  return startDir;
}

function collectMarkers(detectors: readonly Detector[]): string[] {
  const markers = new Set<string>();
  for (const detector of detectors) {
    for (const marker of detector.markers) {
      markers.add(marker);
    }
  }
  return [...markers];
}

async function isMarker(candidate: string): Promise<boolean> {
  return (await isFile(candidate)) || (await isDirectory(candidate));
}
