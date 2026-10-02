import { readFileSync } from "node:fs";

import { MinecraftError } from "./errors.js";

/**
 * Dependency and toolchain versions for one Minecraft version, across
 * every platform that supports it. `null` means "this ecosystem has
 * no (stable) line for this Minecraft version" — scaffolding that
 * platform with this version fails with `EUNSUPPORTED_VERSION`
 * instead of generating a broken build.
 */
export interface MinecraftVersionSpec {
  /** The Minecraft version, e.g. `1.21.1`. */
  readonly minecraft: string;
  /** Extra well-known ids or names that resolve to this spec. */
  readonly aliases: readonly string[];
  /** One-line label shown by the CLI. */
  readonly label: string;
  /** Java toolchain the ecosystems need here. */
  readonly javaVersion: number;
  /** Fabric Loom version used by every Gradle mod build here. */
  readonly loom: string;
  /** Fabric: null when Fabric does not ship this version. */
  readonly fabric: { readonly loader: string; readonly api: string; readonly yarn: string } | null;
  /** NeoForge: null when there is no stable line for this version. */
  readonly neoforge: { readonly version: string; readonly neogradle: string } | null;
  /** Forge (legacy lines only). */
  readonly forge: { readonly version: string; readonly forgegradle: string } | null;
  /** Architectury plugin + API. */
  readonly architectury: { readonly plugin: string; readonly api: string } | null;
  /** Paper / Folia API line (build suffix included). */
  readonly paper: { readonly api: string; readonly loader: string } | null;
  /** Spigot API line. */
  readonly spigot: { readonly api: string } | null;
  /** Velocity API line. */
  readonly velocity: { readonly api: string } | null;
  /** BungeeCord API line. */
  readonly bungeecord: { readonly api: string } | null;
}

interface VersionCatalog {
  readonly default: string;
  readonly versions: readonly MinecraftVersionSpec[];
}

function loadCatalog(): VersionCatalog {
  const raw = readFileSync(new URL("../catalog/versions.json", import.meta.url), "utf8");
  return JSON.parse(raw) as VersionCatalog;
}

const catalog = loadCatalog();

/**
 * The version catalog, newest first. Versions live in
 * `catalog/versions.json` so they can be updated without recompiling.
 * Every template resolves its dependencies through this catalog, so no
 * build file ever hardcodes versions.
 */
export const MINECRAFT_VERSIONS: readonly MinecraftVersionSpec[] = catalog.versions;

/** The default Minecraft version for new scaffolds. */
export const DEFAULT_MINECRAFT_VERSION = catalog.default;

/**
 * One dependency version resolved for a concrete platform. The exact
 * shape depends on the loader; every field the templates need is here.
 */
export interface ResolvedVersions {
  /** The Minecraft version these come from. */
  readonly minecraft: string;
  /** Java toolchain version. */
  readonly javaVersion: number;
  /** Loader family the versions were resolved for. */
  readonly loader: string;
  /** Fabric Loom version for Gradle mod builds. */
  readonly loom: string;
  /** Loader-specific dependency versions, keyed by Gradle property name. */
  readonly deps: Readonly<Record<string, string>>;
}

/** True when the string is a known Minecraft version id or alias. */
export function isKnownMinecraftVersion(value: string): boolean {
  const wanted = value.trim().toLowerCase();
  return MINECRAFT_VERSIONS.some(
    (spec) => spec.minecraft === wanted || spec.aliases.includes(wanted),
  );
}

/**
 * Resolves a Minecraft version id, alias ("stable", "legacy") or
 * friendly name ("Wilderness") to its spec, throwing
 * `EUNKNOWN_VERSION` with the catalog list when nothing matches.
 */
export function resolveVersionSpec(input: string | undefined): MinecraftVersionSpec {
  const wanted = (input ?? DEFAULT_MINECRAFT_VERSION).trim().toLowerCase();
  const spec = MINECRAFT_VERSIONS.find(
    (entry) => entry.minecraft === wanted || entry.aliases.includes(wanted),
  );
  if (spec === undefined) {
    throw MinecraftError.unknownVersion(
      input ?? "",
      MINECRAFT_VERSIONS.map((entry) => entry.minecraft),
    );
  }
  return spec;
}

/** The per-loader line of a spec (null when that loader has none). */
function loaderLine(
  spec: MinecraftVersionSpec,
  loader: string,
): Readonly<Record<string, string>> | null {
  switch (loader) {
    case "fabric":
      return spec.fabric === null
        ? null
        : {
            fabric_loader: spec.fabric.loader,
            fabric_api: spec.fabric.api,
            yarn_mappings: spec.fabric.yarn,
          };
    case "forge":
      return spec.forge === null
        ? null
        : {
            forge_version: spec.forge.version,
            // FML line derived from the Forge build: 1.20.1-47.4.0 -> [47,)
            forge_loader_version: `[${spec.forge.version.split("-")[1]?.split(".")[0] ?? "47"},)`,
          };
    case "neoforge": {
      if (spec.neoforge === null) return null;
      const segments = spec.neoforge.version.split(".");
      return {
        neoforge_version: spec.neoforge.version,
        neogradle_version: spec.neoforge.neogradle,
        neoforge_range: `[${segments[0] ?? "21"}.${segments[1] ?? "0"})`,
      };
    }
    case "architectury":
      return spec.architectury === null
        ? null
        : {
            architectury_plugin: spec.architectury.plugin,
            architectury_api: spec.architectury.api,
          };
    case "paper":
    case "folia":
      return spec.paper === null ? null : { api_version: spec.paper.api };
    case "spigot":
      return spec.spigot === null ? null : { api_version: spec.spigot.api };
    case "velocity":
      return spec.velocity === null ? null : { api_version: spec.velocity.api };
    case "bungeecord":
      return spec.bungeecord === null ? null : { api_version: spec.bungeecord.api };
    default:
      return null;
  }
}

/**
 * Resolves the dependency versions one platform needs for the given
 * spec. Throws `EUNSUPPORTED_VERSION` when the platform has no line
 * for that Minecraft version (e.g. NeoForge on 1.20.1, Forge on 26.x).
 *
 * Loader families merge what their build needs: fabric/forge pull in
 * the Architectury line too, and `architectury` merges fabric plus
 * whatever the second loader of that Minecraft version is (forge on
 * legacy lines, neoforge on modern ones — recorded in
 * `architectury_second_loader`).
 */
export function resolveLoaderVersions(
  spec: MinecraftVersionSpec,
  loader: string,
): ResolvedVersions {
  const fail = (): never => {
    throw MinecraftError.unsupportedVersion(loader, spec.minecraft, spec.label);
  };

  let merged: Record<string, string> = {};
  if (loader === "architectury") {
    const architecturyLine = loaderLine(spec, "architectury");
    const fabricLine = loaderLine(spec, "fabric");
    const secondLoader = spec.forge === null ? "neoforge" : "forge";
    const secondLine = loaderLine(spec, secondLoader);
    if (architecturyLine === null || fabricLine === null || secondLine === null) fail();
    merged = {
      ...merged,
      ...architecturyLine,
      ...fabricLine,
      ...secondLine,
      architectury_second_loader: secondLoader,
    };
  } else {
    const direct = loaderLine(spec, loader);
    if (direct === null) fail();
    merged = { ...merged, ...direct };
  }

  return {
    minecraft: spec.minecraft,
    javaVersion: spec.javaVersion,
    loader,
    loom: spec.loom,
    deps: { ...merged, minecraft_version: spec.minecraft },
  };
}

/** All platform loaders that have a line for a spec, for CLI messaging. */
export function supportedLoaders(spec: MinecraftVersionSpec): readonly string[] {
  const loaders: string[] = [];
  if (spec.fabric !== null) loaders.push("fabric");
  if (spec.forge !== null) loaders.push("forge");
  if (spec.neoforge !== null) loaders.push("neoforge");
  if (spec.paper !== null) loaders.push("paper", "folia");
  if (spec.spigot !== null) loaders.push("spigot");
  if (spec.velocity !== null) loaders.push("velocity");
  if (spec.bungeecord !== null) loaders.push("bungeecord");
  return loaders;
}
