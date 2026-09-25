import { isFile, writeFileString } from "@devix-cli/filesystem";
import { isAbsolute, join, relative, resolve } from "node:path";

import { MinecraftError } from "./errors.js";
import { PLATFORM_IDS } from "./catalog.js";
import { buildTemplates, type TemplateContext } from "./templates/index.js";

/** Options accepted by `scaffold`. */
export interface ScaffoldOptions {
  /** Absolute root where the skeleton is written. */
  readonly root: string;
  /** Platform id from the catalog. */
  readonly platform: string;
  /** Project/mod/plugin name. */
  readonly name: string;
  /** Java package, e.g. `com.example.mymod`. Defaults to `com.example.<slug>`. */
  readonly packageName?: string;
  /** Project version. Defaults to `0.1.0`. */
  readonly version?: string;
  /** Target Minecraft version, recorded in manifests. Defaults to `1.21.1`. */
  readonly minecraftVersion?: string;
  /** List what would be written without touching the filesystem. */
  readonly dryRun?: boolean;
  /**
   * Allow writing into a root that already contains template files.
   * Individual existing files are always skipped, never overwritten.
   */
  readonly overwrite?: boolean;
}

/** One written (or would-be-written) file. */
export interface ScaffoldEntry {
  /** Absolute destination path. */
  readonly path: string;
  /** True when the write was skipped because the file already existed. */
  readonly skipped: boolean;
}

/** Result of a `scaffold` run. */
export interface ScaffoldResult {
  /** Normalized platform id (from the catalog). */
  readonly platform: string;
  /** Absolute root the skeleton was written to. */
  readonly root: string;
  /** Written or would-be-written entries, in template order. */
  readonly files: readonly ScaffoldEntry[];
  /** True when nothing was written because dryRun was set. */
  readonly dryRun: boolean;
}

/** Package token used in default packages: lowercased, identifier-safe. */
function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug.length > 0 ? slug : "project";
}

/** Validates options and normalizes the platform + root. */
function normalizeOptions(options: ScaffoldOptions): TemplateContext {
  if (typeof options.name !== "string" || options.name.trim().length === 0) {
    throw MinecraftError.invalid("name must be a non-empty string");
  }
  if (typeof options.root !== "string" || options.root.trim().length === 0) {
    throw MinecraftError.invalid("root must be a non-empty string");
  }
  if (!isAbsolute(options.root)) {
    throw MinecraftError.invalid(`root must be an absolute path: ${options.root}`);
  }
  if (!PLATFORM_IDS.includes(options.platform)) {
    throw MinecraftError.unknownPlatform(options.platform, PLATFORM_IDS);
  }
  const packageName = options.packageName ?? `com.example.${slugify(options.name)}`;
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(packageName)) {
    throw MinecraftError.invalid(`packageName must look like com.example.project: ${packageName}`);
  }
  return {
    root: resolve(options.root),
    platform: options.platform,
    name: options.name.trim(),
    packageName,
    version: options.version ?? "0.1.0",
    minecraftVersion: options.minecraftVersion ?? "1.21.1",
  };
}

/** Files that already exist at the destination and would be skipped. */
async function findConflicts(root: string, filePaths: readonly string[]): Promise<string[]> {
  const checks = await Promise.all(
    filePaths.map(async (relativePath) => {
      const absolute = join(root, ...relativePath.split("/"));
      return { path: absolute, exists: await isFile(absolute) };
    }),
  );
  return checks.filter((check) => check.exists).map((check) => check.path);
}

/** Writes every template file (or records them in dry-run mode). */
async function writeAll(
  root: string,
  files: readonly { path: string; contents: string }[],
  dryRun: boolean,
): Promise<ScaffoldEntry[]> {
  const entries: ScaffoldEntry[] = [];
  for (const file of files) {
    const destination = join(root, ...file.path.split("/"));
    const skipped = !dryRun && (await isFile(destination));
    if (!dryRun && !skipped) {
      await writeFileString(destination, file.contents, { createDirectories: true });
    }
    entries.push({ path: destination, skipped });
  }
  return entries;
}

function relativeLabel(root: string, path: string): string {
  const rel = relative(root, path);
  return rel.length > 0 ? rel : path;
}

/**
 * Generates a Minecraft platform skeleton at `root`.
 *
 * Safety rules: the target directory is created if missing; existing
 * files are never overwritten (they are reported as `skipped`); with
 * `dryRun: true` nothing is written at all. Without `overwrite`, a
 * root that already contains any of the template files fails with
 * `EEXISTS` instead of half-filling an existing project.
 */
export async function scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const context = normalizeOptions(options);
  const files = buildTemplates(context);

  if (options.dryRun !== true && options.overwrite !== true) {
    const conflicts = await findConflicts(
      context.root,
      files.map((file) => file.path),
    );
    if (conflicts.length > 0) {
      throw MinecraftError.targetExists(context.root, conflicts);
    }
  }

  const entries = await writeAll(context.root, files, options.dryRun === true);

  return {
    platform: context.platform,
    root: context.root,
    files: entries,
    dryRun: options.dryRun === true,
  };
}

/** Human-readable summary lines used by the CLI. */
export function summarizeScaffold(result: ScaffoldResult): string[] {
  const lines: string[] = [
    `${result.dryRun ? "Would write" : "Wrote"} ${String(result.files.length)} file(s) at ${result.root}`,
  ];
  for (const entry of result.files) {
    lines.push(
      `  ${entry.skipped ? "skipped" : "created"}: ${relativeLabel(result.root, entry.path)}`,
    );
  }
  return lines;
}
