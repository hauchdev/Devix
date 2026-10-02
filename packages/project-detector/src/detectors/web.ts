import { readFileString } from "@devix-cli/filesystem";
import { join } from "node:path";

import type { DetectContext, Detection, DetectionResult, Detector } from "../types.js";

/**
 * Web frameworks and build tools, keyed by the package that proves
 * their use. The id is what Devix reports; `label` is the human name.
 */
const WEB_FRAMEWORKS: readonly { id: string; label: string; packages: readonly string[] }[] = [
  { id: "next", label: "Next.js", packages: ["next"] },
  { id: "nuxt", label: "Nuxt", packages: ["nuxt", "nuxt3", "nuxt4"] },
  { id: "astro", label: "Astro", packages: ["astro"] },
  { id: "sveltekit", label: "SvelteKit", packages: ["@sveltejs/kit"] },
  { id: "remix", label: "Remix", packages: ["@remix-run/react", "@remix-run/dev"] },
  { id: "angular", label: "Angular", packages: ["@angular/core"] },
  { id: "solidstart", label: "SolidStart", packages: ["@solidjs/start", "solid-start"] },
  { id: "gatsby", label: "Gatsby", packages: ["gatsby"] },
  { id: "eleventy", label: "Eleventy", packages: ["@11ty/eleventy"] },
  { id: "vite", label: "Vite", packages: ["vite"] },
  { id: "webpack", label: "webpack", packages: ["webpack"] },
  { id: "parcel", label: "Parcel", packages: ["parcel"] },
];

/**
 * Frameworks that ship their own static output. They have no dev
 * server task, so `devix web serve/build` reports them as static sites.
 */
const STATIC_FRAMEWORK_IDS: ReadonlySet<string> = new Set(["astro", "eleventy", "gatsby"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Collects every dependency name from a package.json, any value shape. */
function dependencyNames(parsed: Record<string, unknown>): Set<string> {
  const names = new Set<string>();

  for (const field of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    const section = parsed[field];
    if (!isRecord(section)) {
      continue;
    }
    for (const name of Object.keys(section)) {
      names.add(name);
    }
  }

  return names;
}

/**
 * Detects web frameworks and bundlers from the project's dependency
 * list. A malformed package.json still counts as detected (the file
 * exists) but yields no framework evidence, matching the package-wide
 * "malformed is detected, without details" rule.
 */
export const webDetector: Detector = {
  id: "web",
  name: "Web",
  category: "web",
  markers: ["package.json"],

  async detect(context: DetectContext): Promise<DetectionResult> {
    const packageJsonPath = join(context.root, "package.json");

    const content = await readFileString(packageJsonPath).catch(() => undefined);
    if (content === undefined) {
      return { detected: false, detections: [] };
    }

    let parsed: Record<string, unknown> | undefined;
    try {
      const value: unknown = JSON.parse(content);
      parsed = isRecord(value) ? value : undefined;
    } catch {
      parsed = undefined;
    }

    if (parsed === undefined) {
      return { detected: true, detections: [{ marker: "package.json", path: packageJsonPath }] };
    }

    const installed = dependencyNames(parsed);
    const detections: Detection[] = [];

    for (const framework of WEB_FRAMEWORKS) {
      const matched = framework.packages.find((pkg) => installed.has(pkg));
      if (matched !== undefined) {
        detections.push({
          marker: `package.json#${matched}`,
          path: packageJsonPath,
          detail: framework.label,
        });
      }
    }

    if (detections.length === 0) {
      return { detected: false, detections: [] };
    }

    return { detected: true, detections };
  },
};

/** Web framework ids that build to static output. */
export function isStaticWebFramework(id: string): boolean {
  return STATIC_FRAMEWORK_IDS.has(id);
}

/** All web framework ids the detector can report, in a stable order. */
export const WEB_FRAMEWORK_IDS: readonly string[] = WEB_FRAMEWORKS.map((framework) => framework.id);

/**
 * Resolves the framework id for an evidence marker of the form
 * `package.json#<package>`. Returns `undefined` for unknown packages,
 * so a stale marker never invents a framework.
 */
export function webFrameworkIdForMarker(marker: string): string | undefined {
  const prefix = "package.json#";
  if (!marker.startsWith(prefix)) {
    return undefined;
  }
  const packageName = marker.slice(prefix.length);
  return WEB_FRAMEWORKS.find((framework) => framework.packages.includes(packageName))?.id;
}
