import { isDirectory, isFile, walkUp } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { Detector } from "./types.js";

/**
 * Finds the project root starting at `startDir`.
 *
 * Walks upward and stops at the nearest directory containing any
 * marker declared by any detector. The starting directory itself is
 * considered first. If no marker is found anywhere, returns the
 * starting directory: callers treat that as "not a project".
 *
 * Marker checks are issued in parallel per directory: they are
 * independent reads, and sequential probing of every marker on every
 * ancestor is measurably slow on Windows (the no-marker worst case
 * walks the whole path tree).
 */
export async function findProjectRoot(
  startDir: string,
  detectors: readonly Detector[],
): Promise<string> {
  const markers = collectMarkers(detectors);

  for await (const dir of walkUp(startDir)) {
    if (await hasAnyMarker(dir, markers)) {
      return dir;
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

/** True when any marker exists in `dir`, checking candidates in parallel. */
async function hasAnyMarker(dir: string, markers: readonly string[]): Promise<boolean> {
  const results = await Promise.all(markers.map((marker) => isMarker(join(dir, marker))));
  return results.some((found) => found);
}

async function isMarker(candidate: string): Promise<boolean> {
  return (await isFile(candidate)) || (await isDirectory(candidate));
}
