import { isFile, readFileString } from "@devix/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/** Markers checked in declaration order. */
const PYTHON_MARKERS = [
  "pyproject.toml",
  "requirements.txt",
  "requirements-dev.txt",
  "requirements_dev.txt",
  "setup.py",
  "setup.cfg",
  "Pipfile",
  "Pipfile.lock",
  "poetry.lock",
  "uv.lock",
] as const;

/**
 * Extracts the project name from the `[project]` section of a
 * pyproject.toml. This is not a TOML parser: just enough to read the
 * `name` field from well-formed files. A malformed manifest is not a
 * detection failure: the marker still counts without detail.
 */
function parsePyProjectName(content: string): string | undefined {
  const sectionMatch = /^\s*\[project\]\s*$/m.exec(content);
  if (sectionMatch === null) {
    return undefined;
  }
  const rest = content.slice((sectionMatch.index ?? 0) + sectionMatch[0].length);
  const fieldMatch = /^\s*name\s*=\s*"([^"]+)"/m.exec(rest);
  return fieldMatch?.[1];
}

/**
 * Detects Python projects via `pyproject.toml`, `requirements*.txt`,
 * `setup.py`/`setup.cfg`, `Pipfile` or any of the common lockfiles in
 * the project root.
 *
 * Extracts the `[project]` name from pyproject.toml as a detection
 * detail. "Not found" is not an error.
 */
export const pythonDetector: Detector = {
  id: "python",
  name: "Python",
  markers: PYTHON_MARKERS,

  async detect(context: DetectContext): Promise<DetectionResult> {
    const detections: Detection[] = [];

    for (const marker of PYTHON_MARKERS) {
      const path = join(context.root, marker);
      if (await isFile(path)) {
        if (marker === "pyproject.toml") {
          const content = await readFileString(path).catch(() => undefined);
          const name = content === undefined ? undefined : parsePyProjectName(content);
          detections.push(name === undefined ? { marker, path } : { marker, path, detail: name });
        } else {
          detections.push({ marker, path });
        }
      }
    }

    return detections.length > 0
      ? { detected: true, detections }
      : { detected: false, detections: [] };
  },
};
