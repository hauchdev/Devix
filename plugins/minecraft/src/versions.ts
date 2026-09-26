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

/**
 * The version catalog, newest first. Adding a Minecraft version means
 * adding one entry here — every template resolves its dependencies
 * through it, so no build file ever hardcodes versions.
 */
export const MINECRAFT_VERSIONS: readonly MinecraftVersionSpec[] = [
  {
    minecraft: "26.3",
    aliases: ["wilderness", "wilderness-bound", "26.3", "stable"],
    label: "26.3 — Wilderness Bound (latest drop)",
    javaVersion: 21,
    loom: "1.11-SNAPSHOT",
    fabric: { loader: "0.17.3", api: "0.140.0+26.3", yarn: "26.3+build.1" },
    neoforge: { version: "26.3.0", neogradle: "7.0.194" },
    forge: null,
    architectury: { plugin: "3.4-SNAPSHOT", api: "17.0.8" },
    paper: { api: "26.3-R0.1-SNAPSHOT", loader: "0.17.3" },
    spigot: { api: "26.3-R0.1-SNAPSHOT" },
    velocity: { api: "3.4.0-SNAPSHOT" },
    bungeecord: { api: "1.21-R0.4-SNAPSHOT" },
  },
  {
    minecraft: "26.1",
    aliases: ["tiny-takeover", "tiny", "26.1"],
    label: "26.1 — Tiny Takeover",
    javaVersion: 21,
    loom: "1.11-SNAPSHOT",
    fabric: { loader: "0.17.2", api: "0.133.4+26.1", yarn: "26.1+build.1" },
    neoforge: { version: "26.1.9", neogradle: "7.0.180" },
    forge: null,
    architectury: { plugin: "3.4-SNAPSHOT", api: "17.0.8" },
    paper: { api: "26.1-R0.1-SNAPSHOT", loader: "0.17.2" },
    spigot: { api: "26.1-R0.1-SNAPSHOT" },
    velocity: { api: "3.4.0-SNAPSHOT" },
    bungeecord: { api: "1.21-R0.4-SNAPSHOT" },
  },
  {
    minecraft: "1.21.11",
    aliases: ["1.21.11"],
    label: "1.21.11 — legacy line (pre year-drop numbering)",
    javaVersion: 21,
    loom: "1.10-SNAPSHOT",
    fabric: { loader: "0.17.2", api: "0.140.0+1.21.11", yarn: "1.21.11+build.1" },
    neoforge: { version: "21.11.5", neogradle: "7.0.171" },
    forge: null,
    architectury: { plugin: "3.4-SNAPSHOT", api: "16.1.11" },
    paper: { api: "1.21.11-R0.1-SNAPSHOT", loader: "0.17.2" },
    spigot: { api: "1.21.11-R0.1-SNAPSHOT" },
    velocity: { api: "3.4.0-SNAPSHOT" },
    bungeecord: { api: "1.21-R0.4-SNAPSHOT" },
  },
  {
    minecraft: "1.21.1",
    aliases: ["1.21.1", "legacy"],
    label: "1.21.1 — classic legacy line",
    javaVersion: 21,
    loom: "1.9-SNAPSHOT",
    fabric: { loader: "0.16.14", api: "0.115.6+1.21.1", yarn: "1.21.1+build.3" },
    neoforge: { version: "21.1.209", neogradle: "7.0.171" },
    forge: { version: "1.21.1-52.1.1", forgegradle: "[6.0.24,6.2)" },
    architectury: { plugin: "3.4-SNAPSHOT", api: "13.0.8" },
    paper: { api: "1.21.1-R0.1-SNAPSHOT", loader: "0.16.14" },
    spigot: { api: "1.21.1-R0.1-SNAPSHOT" },
    velocity: { api: "3.4.0-SNAPSHOT" },
    bungeecord: { api: "1.20-R0.3-SNAPSHOT" },
  },
  {
    minecraft: "1.20.1",
    aliases: ["1.20.1"],
    label: "1.20.1 — the long-lived Forge classic",
    javaVersion: 17,
    loom: "1.7-SNAPSHOT",
    fabric: { loader: "0.16.14", api: "0.92.6+1.20.1", yarn: "1.20.1+build.10" },
    neoforge: null,
    forge: { version: "1.20.1-47.4.0", forgegradle: "[6.0,6.2)" },
    architectury: { plugin: "3.4-SNAPSHOT", api: "9.2.14" },
    paper: { api: "1.20.1-R0.1-SNAPSHOT", loader: "0.16.14" },
    spigot: { api: "1.20.1-R0.1-SNAPSHOT" },
    velocity: { api: "3.3.0-SNAPSHOT" },
    bungeecord: { api: "1.20-R0.2-SNAPSHOT" },
  },
];

/** The default Minecraft version for new scaffolds. */
export const DEFAULT_MINECRAFT_VERSION = "26.3";

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
