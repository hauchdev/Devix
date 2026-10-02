import type { DetectedWebFramework, WebDetection } from "@devix-cli/project-detector";
import {
  createDefaultRegistry,
  detectWeb,
  isStaticWebFramework,
  type DetectorRegistry,
} from "@devix-cli/project-detector";

/** Options shared by the web service functions. */
export interface WebProjectOptions {
  /** Absolute path of the project directory. */
  readonly root: string;
  /** Detector registry. Defaults to `createDefaultRegistry()`. */
  readonly registry?: DetectorRegistry;
}

/** One environment variable found in a project file. */
export interface WebEnvVariable {
  /** Variable name, e.g. "DATABASE_URL". */
  readonly name: string;
  /** Which file declared it. */
  readonly source: string;
  /**
   * Always `undefined`: Devix never reads or reports secret values.
   * The property exists so consumers cannot mistake its absence for a
   * missing variable.
   */
  readonly value?: undefined;
}

/** One npm script found in the project. */
export interface WebScript {
  /** Script name, e.g. "dev". */
  readonly name: string;
  /** The command the script runs. */
  readonly command: string;
}

/** A static site output directory that exists on disk. */
export interface WebBuildOutput {
  /** Absolute path of the output directory. */
  readonly path: string;
  /** The framework that produced it. */
  readonly framework: string;
}

/** Raised when the directory is not a web project. */
export class WebError extends Error {
  readonly code: "ENOT_WEB" | "EINVALID";

  private constructor(code: "ENOT_WEB" | "EINVALID", message: string) {
    super(message);
    this.name = "WebError";
    this.code = code;
  }

  /** The directory has no detectable web framework. */
  static notWeb(root: string): WebError {
    return new WebError("ENOT_WEB", `No web framework detected in ${root}`);
  }

  /** Bad caller input. */
  static invalid(message: string): WebError {
    return new WebError("EINVALID", message);
  }
}

async function readPackageJson(root: string): Promise<Record<string, unknown> | undefined> {
  const { readFileString } = await import("@devix-cli/filesystem");
  const { join } = await import("node:path");

  const content = await readFileString(join(root, "package.json")).catch(() => undefined);
  if (content === undefined) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Detects the web frameworks used by the project. */
export async function detectWebProject(options: WebProjectOptions): Promise<WebDetection> {
  const registry = options.registry ?? createDefaultRegistry();
  return detectWeb(registry, { root: options.root });
}

/**
 * Returns the environment variable **names** declared by the project.
 *
 * Names are read from `.env`-style files and from `process.env` keys
 * that the project declares (via framework config). Values are never
 * read, logged or returned: a variable name is safe, a secret is not.
 */
export async function listEnvVariables(options: WebProjectOptions): Promise<WebEnvVariable[]> {
  const { readFileString } = await import("@devix-cli/filesystem");
  const { join } = await import("node:path");

  const sources = [".env", ".env.local", ".env.example", ".env.sample"] as const;
  const found = new Map<string, WebEnvVariable>();

  for (const source of sources) {
    const content = await readFileString(join(options.root, source)).catch(() => undefined);
    if (content === undefined) {
      continue;
    }

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) {
        continue;
      }
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(trimmed);
      const name = match?.[1];
      if (name !== undefined && !found.has(name)) {
        found.set(name, { name, source });
      }
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Returns the npm scripts declared by the project. */
export async function listScripts(options: WebProjectOptions): Promise<WebScript[]> {
  const packageJson = await readPackageJson(options.root);
  const scripts = packageJson?.["scripts"];

  if (typeof scripts !== "object" || scripts === null || Array.isArray(scripts)) {
    return [];
  }

  return Object.entries(scripts as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, command]) => ({ name, command }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Locates the static build output for a framework, if it exists.
 *
 * Returns `undefined` when the project has not been built yet; that is
 * a normal state, not an error.
 */
export async function findStaticOutput(
  options: WebProjectOptions,
): Promise<WebBuildOutput | undefined> {
  const { isDirectory } = await import("@devix-cli/filesystem");
  const { join } = await import("node:path");

  const detection = await detectWebProject(options);
  if (!detection.isWeb) {
    return undefined;
  }

  const candidate = detection.frameworks.find((framework: DetectedWebFramework) =>
    isStaticWebFramework(framework.id),
  );
  const target = candidate ?? detection.frameworks[0];
  if (target === undefined) {
    return undefined;
  }

  // Astro and Eleventy use `dist`, Gatsby uses `public`, Vite uses `dist`.
  const directoryName = target.id === "gatsby" ? "public" : "dist";
  const path = join(options.root, directoryName);

  return (await isDirectory(path)) ? { path, framework: target.label } : undefined;
}

/** The default port used by the static file server. */
export const DEFAULT_SERVE_PORT = 4173;
