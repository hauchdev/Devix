import { isFile, readFileString } from "@devix/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Strips `//` and `/* *\/` comments and trailing commas so real-world
 * JSONC tsconfigs parse as JSON. Strings are preserved verbatim: this
 * is not a full JSONC parser, just enough to read well-formed configs.
 * A config that still fails to parse is reported without detail, never
 * as an error.
 */
function stripJsonComments(content: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inString) {
      out += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (i < content.length && content[i] !== "\n") {
        i++;
      }
      out += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      const end = content.indexOf("*/", i + 2);
      i = end === -1 ? content.length : end + 1;
      out += " ";
      continue;
    }

    if (char === ",") {
      let j = i + 1;
      while (j < content.length && /\s/.test(content[j])) {
        j++;
      }
      if (content[j] === "}" || content[j] === "]") {
        // Trailing comma before a closing bracket: drop it.
        continue;
      }
    }

    out += char;
  }

  return out;
}

function parseTsConfig(path: string, content: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(stripJsonComments(content));
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Extracts the TypeScript version from package.json dependencies. */
function parseTypeScriptVersion(packageJsonContent: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(packageJsonContent);
    if (!isRecord(parsed)) {
      return undefined;
    }
    const sections = ["dependencies", "devDependencies", "peerDependencies"] as const;
    for (const section of sections) {
      const deps = parsed[section];
      if (isRecord(deps) && typeof deps["typescript"] === "string") {
        return deps["typescript"];
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Detects TypeScript projects via `tsconfig.json` in the project root.
 *
 * Extracts the `compilerOptions.target` and the TypeScript version
 * declared in `package.json` as detection details. "Not found" is not
 * an error, and a malformed tsconfig is not a detection failure: the
 * marker still counts.
 */
export const typescriptDetector: Detector = {
  id: "typescript",
  name: "TypeScript",
  markers: ["tsconfig.json"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const tsConfigPath = join(context.root, "tsconfig.json");

    if (!(await isFile(tsConfigPath))) {
      return { detected: false, detections: [] };
    }

    const detections: Detection[] = [{ marker: "tsconfig.json", path: tsConfigPath }];

    const content = await readFileString(tsConfigPath).catch(() => undefined);
    if (content !== undefined) {
      const config = parseTsConfig(tsConfigPath, content);

      const compilerOptions = config?.["compilerOptions"];
      const target =
        isRecord(compilerOptions) && typeof compilerOptions["target"] === "string"
          ? compilerOptions["target"]
          : undefined;
      if (target !== undefined) {
        detections.push({
          marker: "tsconfig.json#target",
          path: tsConfigPath,
          detail: target,
        });
      }
    }

    const packageJsonPath = join(context.root, "package.json");
    if (await isFile(packageJsonPath)) {
      const packageJsonContent = await readFileString(packageJsonPath).catch(() => undefined);
      const version =
        packageJsonContent === undefined ? undefined : parseTypeScriptVersion(packageJsonContent);
      if (version !== undefined) {
        detections.push({
          marker: "package.json#typescript",
          path: packageJsonPath,
          detail: version,
        });
      }
    }

    return { detected: true, detections };
  },
};
