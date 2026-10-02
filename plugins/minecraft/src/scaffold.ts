import { isFile, writeFileString } from "@devix-cli/filesystem";
import { createDefaultRegistry, detectMinecraftPlatforms } from "@devix-cli/project-detector";
import { chmod } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { MinecraftError } from "./errors.js";
import {
  getPlatform,
  getProjectKind,
  MODULE_IDS,
  PLATFORM_IDS,
  type MinecraftProjectKind,
} from "./catalog.js";
import {
  DEFAULT_MINECRAFT_VERSION,
  resolveLoaderVersions,
  resolveVersionSpec,
} from "./versions.js";
import { buildTemplates, type TemplateContext } from "./templates/index.js";
import type { DetectedMinecraftPlatform } from "@devix-cli/project-detector";

/** Options accepted by `scaffold`. */
export interface ScaffoldOptions {
  /** Absolute root where the skeleton is written. */
  readonly root: string;
  /**
   * Platform id (or comma/plus separated ids for a multi-loader
   * project, e.g. `fabric+forge`). Required unless `kind` is given
   * (then it must be omitted — the kind's default platform is used).
   */
  readonly platform?: string | string[];
  /**
   * Project kind (`mod`, `plugin`, `proxy-plugin`): resolves to the
   * kind's default platform when no `platform` is given. Mutually
   * exclusive with `platform`.
   */
  readonly kind?: MinecraftProjectKind;
  /** Project/mod/plugin name. */
  readonly name: string;
  /** Java package, e.g. `com.example.mymod`. Defaults to `com.example.<slug>`. */
  readonly packageName?: string;
  /** Project version. Defaults to `0.1.0`. */
  readonly version?: string;
  /**
   * Target Minecraft version: a catalog id (`26.3`, `1.21.1`), an
   * alias (`stable`, `legacy`) or a drop name (`Wilderness`). Drives
   * every dependency line of the generated builds. Defaults to the
   * newest catalog entry.
   */
  readonly minecraftVersion?: string;
  /**
   * Optional extra modules (`api`, `core`, `game-tests`, `datagen`).
   * Any module turns the project into a Gradle/Maven multi-project.
   */
  readonly modules?: readonly string[];
  /** List what would be written without touching the filesystem. */
  readonly dryRun?: boolean;
  /**
   * Allow writing into a root that already contains template files.
   * Individual existing files are always skipped, never overwritten.
   */
  readonly overwrite?: boolean;
  /**
   * Allow scaffolding into a directory that already looks like a
   * Minecraft project (any minecraft-category detector matched).
   * Defaults to `false`: the run fails with `EINVALID_INPUT` instead.
   */
  readonly allowExistingProject?: boolean;
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
  /** Normalized platform ids (from the catalog), in scaffold order. */
  readonly platforms: readonly string[];
  /** Resolved project kind. */
  readonly kind: MinecraftProjectKind;
  /** Absolute root the skeleton was written to. */
  readonly root: string;
  /** Project name. */
  readonly name: string;
  /** Resolved Minecraft version. */
  readonly minecraftVersion: string;
  /** Java toolchain the generated builds use. */
  readonly javaVersion: number;
  /** Modules of the project: entrypoint first, extras after. */
  readonly modules: readonly string[];
  /** Written or would-be-written entries, in template order. */
  readonly files: readonly ScaffoldEntry[];
  /** True when nothing was written because dryRun was set. */
  readonly dryRun: boolean;
  /**
   * What the destination looked like before writing: the Minecraft
   * platforms detected at `root`, in registration order. Empty when
   * the destination contained no Minecraft markers.
   */
  readonly targetPlatforms: readonly DetectedMinecraftPlatform[];
}

/** Package token used in default packages: lowercased, identifier-safe. */
function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug.length > 0 ? slug : "project";
}

/** Splits a platform argument: `fabric+forge` / `fabric,forge` / arrays. */
function parsePlatformIds(platform: string | string[]): string[] {
  const raw = Array.isArray(platform) ? platform : platform.split(/[+,]/);
  const ids = raw.map((id) => id.trim()).filter((id) => id.length > 0);
  if (ids.length === 0) {
    throw MinecraftError.invalid("platform must name at least one platform");
  }
  return ids;
}

/** The default platform of a kind (the first catalog entry of it). */
function defaultPlatformOfKind(kind: MinecraftProjectKind): string {
  const platform = PLATFORM_IDS.map((id) => getPlatform(id)).find((p) => p?.kind === kind);
  return platform?.id ?? "fabric";
}

/**
 * Validates and resolves the requested platform combination into
 * distinct, catalog-known platform ids.
 */
function resolvePlatforms(options: ScaffoldOptions): string[] {
  if (options.kind !== undefined && options.platform !== undefined) {
    throw MinecraftError.invalid("Pass either kind or platform, not both.");
  }
  if (options.kind !== undefined) {
    if (getProjectKind(options.kind) === undefined) {
      throw MinecraftError.invalid(
        `Unknown kind: ${String(options.kind)}. Known kinds: mod, plugin, proxy-plugin.`,
      );
    }
    return [defaultPlatformOfKind(options.kind)];
  }
  if (options.platform === undefined) {
    throw MinecraftError.invalid("Either kind or platform is required.");
  }

  const ids = parsePlatformIds(options.platform);
  const unique: string[] = [];
  for (const id of ids) {
    if (!PLATFORM_IDS.includes(id)) {
      throw MinecraftError.unknownPlatform(id, PLATFORM_IDS);
    }
    if (!unique.includes(id)) {
      unique.push(id);
    }
  }

  const platforms = unique.map(
    (id) => getPlatform(id) as NonNullable<ReturnType<typeof getPlatform>>,
  );
  const kinds = new Set(platforms.map((platform) => platform.kind));
  if (kinds.size > 1) {
    throw MinecraftError.invalid(
      `Multi-platform projects must stay within one kind; got: ${unique.join(", ")}.`,
    );
  }
  const nonCombinable = platforms.filter((platform) => !platform.combinable);
  if (unique.length > 1 && nonCombinable.length > 0) {
    throw MinecraftError.invalid(
      `Platform${nonCombinable.length === 1 ? "" : "s"} ${nonCombinable
        .map((platform) => platform.id)
        .join(", ")} cannot be combined with others (single-loader build). ` +
        "Combine gradle mod loaders instead, e.g. fabric+forge or fabric+neoforge.",
    );
  }
  if (unique.length > 3) {
    throw MinecraftError.invalid(`At most three loaders per project; got: ${unique.join(", ")}.`);
  }
  return unique;
}

/**
 * Validates the requested modules against the catalog and the
 * platforms: any module set turns the project multi-module; modules
 * that compile loader code (game-tests, datagen) require at least one
 * mod-loader platform in the combination.
 */
function resolveModules(
  modules: readonly string[] | undefined,
  platformIds: readonly string[],
): string[] {
  if (modules === undefined) {
    return ["main"];
  }
  const unique: string[] = [];
  for (const moduleId of modules) {
    const id = moduleId.trim();
    if (id.length === 0) {
      continue;
    }
    if (!MODULE_IDS.includes(id)) {
      throw MinecraftError.unknownModule(id, MODULE_IDS);
    }
    if (!unique.includes(id)) {
      unique.push(id);
    }
  }
  if (unique.length === 0) {
    return ["main"];
  }

  const platforms = platformIds
    .map((id) => getPlatform(id))
    .filter((platform) => platform !== undefined);
  const needsLoader = new Set(["game-tests", "datagen"]);
  for (const moduleId of unique) {
    if (needsLoader.has(moduleId)) {
      const hasLoader = platforms.some((platform) => platform.kind === "mod");
      if (!hasLoader) {
        throw MinecraftError.invalid(
          `Module ${moduleId} needs a mod loader platform (fabric, forge, neoforge); got: ${platformIds.join(",")}.`,
        );
      }
    }
  }
  return ["main", ...unique];
}

/** Validates options and normalizes the kind + platforms + root. */
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
  if (
    options.packageName !== undefined &&
    !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(options.packageName)
  ) {
    throw MinecraftError.invalid(
      `packageName must look like com.example.project: ${options.packageName}`,
    );
  }

  const platformIds = resolvePlatforms(options);
  const primaryId: string = platformIds[0] ?? "fabric";
  const primary = getPlatform(primaryId);
  if (primary === undefined) {
    throw MinecraftError.unknownPlatform(primaryId, PLATFORM_IDS);
  }
  const modules = resolveModules(options.modules, platformIds);

  const versionSpec = resolveVersionSpec(options.minecraftVersion);
  const versions = platformIds.map((id) => {
    const platform = getPlatform(id) as NonNullable<ReturnType<typeof getPlatform>>;
    const loaders = platform.id === "architectury" ? ["architectury"] : platform.loaders;
    const loader: string = loaders[0] ?? platform.id;
    return resolveLoaderVersions(versionSpec, loader);
  });

  return {
    root: resolve(options.root),
    platform: primaryId,
    platforms: platformIds,
    kind: primary.kind,
    name: options.name.trim(),
    packageName: options.packageName ?? `com.example.${slugify(options.name)}`,
    version: options.version ?? "0.1.0",
    versions,
    modules,
    multimodule: modules.length > 1,
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
      if (file.path === "gradlew") {
        await chmod(destination, 0o755).catch(() => {
          // Best-effort: Windows does not use POSIX permissions.
        });
      }
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
 * Generates a Minecraft project skeleton at `root`.
 *
 * Shapes supported:
 * - single platform (`platform: "paper"`), the classic layout;
 * - multi-loader Gradle project (`platform: "fabric+forge"`), one
 *   shared version catalog, one build per loader;
 * - Architectury (`platform: "architectury"`), common + fabric + the
 *   modern/legacy second loader of the chosen Minecraft version;
 * - multi-module (any `modules` beyond none), extra Gradle/Maven
 *   subprojects wired through settings/pom files.
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

  const targetDetection = await detectMinecraftPlatforms(createDefaultRegistry(), {
    root: context.root,
  });
  if (
    targetDetection.isMinecraft &&
    options.allowExistingProject !== true &&
    options.dryRun !== true
  ) {
    throw MinecraftError.targetIsProject(
      context.root,
      targetDetection.platforms.map((platform) => platform.name),
    );
  }

  const entries = await writeAll(context.root, files, options.dryRun === true);

  return {
    platforms: context.platforms,
    kind: context.kind,
    root: context.root,
    name: context.name,
    minecraftVersion: context.versions[0]?.minecraft ?? DEFAULT_MINECRAFT_VERSION,
    javaVersion: context.versions[0]?.javaVersion ?? 21,
    modules: context.modules,
    files: entries,
    dryRun: options.dryRun === true,
    targetPlatforms: targetDetection.platforms,
  };
}

/** Human-readable summary lines used by the CLI. */
export function summarizeScaffold(result: ScaffoldResult): string[] {
  const lines: string[] = [
    `${result.dryRun ? "Would write" : "Wrote"} ${String(result.files.length)} file(s) at ${result.root}`,
    `  kind: ${result.kind} — platform${result.platforms.length === 1 ? "" : "s"}: ${result.platforms.join(" + ")}`,
    `  minecraft: ${result.minecraftVersion} (Java ${String(result.javaVersion)})`,
    ...(result.modules.length > 1 ? [`  modules: ${result.modules.join(", ")}`] : []),
  ];
  for (const platform of result.targetPlatforms) {
    lines.push(
      `  note: target is already a ${platform.name} project${platform.detail === undefined ? "" : ` (${platform.detail})`}`,
    );
  }
  for (const entry of result.files) {
    lines.push(
      `  ${entry.skipped ? "skipped" : "created"}: ${relativeLabel(result.root, entry.path)}`,
    );
  }
  return lines;
}
