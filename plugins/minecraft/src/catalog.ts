/**
 * The scaffolding taxonomy the CLI and the API share.
 *
 * The interactive flow asks in this order: project kind (mod, plugin,
 * proxy), then the target platform(s) (multi-select), then optional
 * extra modules (core/api/… subprojects).
 */

/** The kind of Minecraft project a platform generates. */
export type MinecraftProjectKind = "mod" | "plugin" | "proxy-plugin";

/** One selectable project kind, in the order the CLI asks for it. */
export interface MinecraftProjectKindInfo {
  /** Stable id used in the API and CLI. */
  readonly id: MinecraftProjectKind;
  /** Display name. */
  readonly name: string;
  /** One-line description. */
  readonly description: string;
}

/**
 * The project kinds, in prompt order. Mods run inside the game,
 * plugins extend a server, proxy plugins extend a proxy.
 */
export const MINECRAFT_PROJECT_KINDS: readonly MinecraftProjectKindInfo[] = [
  {
    id: "mod",
    name: "Mod",
    description: "Runs inside the game client/server (Fabric, Forge, NeoForge, Architectury).",
  },
  {
    id: "plugin",
    name: "Plugin",
    description: "Runs on a game server (Paper, Folia, Spigot).",
  },
  {
    id: "proxy-plugin",
    name: "Proxy plugin",
    description: "Runs on a proxy such as Velocity or BungeeCord.",
  },
];

/** Optional extra Gradle module the scaffold can add to a project. */
export interface MinecraftModuleKindInfo {
  /** Stable id used in the API and CLI. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** One-line description. */
  readonly description: string;
  /** The kinds of projects the module makes sense for. */
  readonly kinds: readonly MinecraftProjectKind[];
  /**
   * Platforms the module requires as base (AND). Empty means any
   * platform of the module's kinds. A module that is itself a loader
   * target (e.g. `game-tests`) needs a mod loader present.
   */
  readonly requiresPlatforms: readonly string[];
}

/**
 * The optional extra modules. When any module is selected the project
 * becomes a Gradle multi-project: the main module keeps its single
 * name, every extra one gets a `<name>-<module>` subproject wired
 * through `settings.gradle`.
 */
export const MINECRAFT_MODULES: readonly MinecraftModuleKindInfo[] = [
  {
    id: "api",
    name: "API",
    description: "Public API subproject other developers can compile against.",
    kinds: ["mod", "plugin", "proxy-plugin"],
    requiresPlatforms: [],
  },
  {
    id: "core",
    name: "Core",
    description: "Internal implementation module split out of the entrypoint.",
    kinds: ["mod", "plugin", "proxy-plugin"],
    requiresPlatforms: [],
  },
  {
    id: "game-tests",
    name: "Game tests",
    description: "In-game test suite (GameTest / gametest runner) as its own module.",
    kinds: ["mod"],
    requiresPlatforms: ["fabric", "forge", "neoforge"],
  },
  {
    id: "datagen",
    name: "Datagen",
    description: "Data generation module for recipes, models, loot tables and lang files.",
    kinds: ["mod"],
    requiresPlatforms: ["fabric", "forge", "neoforge"],
  },
];

/** The ids of the optional modules, in catalog order. */
export const MODULE_IDS: readonly string[] = MINECRAFT_MODULES.map((module) => module.id);

/**
 * A platform the plugin can scaffold, with the metadata the CLI and
 * the API share. `loaders` lists the mod/loader ids the platform
 * implements (the maven coordinate style differs per loader), so a
 * multi-platform project can share one build when they cooperate.
 */
export interface MinecraftPlatform {
  /** Stable id used in the API and CLI. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** What kind of project it generates. */
  readonly kind: MinecraftProjectKind;
  /** One-line description. */
  readonly description: string;
  /** Gradle or Maven. */
  readonly buildSystem: "gradle" | "maven";
  /**
   * Loader ids this platform covers, e.g. fabric covers both the
   * Fabric and Quilt loader ecosystems. Order matters: it is the
   * default multi-loader order.
   */
  readonly loaders: readonly string[];
  /**
   * Whether selecting this platform together with others produces one
   * shared multi-loader build. When `false`, combining it with other
   * platforms is rejected (`platforms.exclusive`).
   */
  readonly combinable: boolean;
}

/**
 * All supported platforms. Multi-loader capable ones (fabric, forge,
 * neoforge, architectury) can be combined into a single Gradle
 * multi-project; Maven-based plugins/proxies stay single-platform.
 */
export const MINECRAFT_PLATFORMS: readonly MinecraftPlatform[] = [
  {
    id: "fabric",
    name: "Fabric",
    kind: "mod",
    description: "Fabric mod skeleton (Loom + fabric.mod.json + client/main split).",
    buildSystem: "gradle",
    loaders: ["fabric"],
    combinable: true,
  },
  {
    id: "forge",
    name: "Forge",
    kind: "mod",
    description: "Forge mod skeleton (ForgeGradle + mods.toml + @Mod main class).",
    buildSystem: "gradle",
    loaders: ["forge"],
    combinable: true,
  },
  {
    id: "neoforge",
    name: "NeoForge",
    kind: "mod",
    description: "NeoForge mod skeleton (NeoGradle + neoforge.mods.toml + @Mod main class).",
    buildSystem: "gradle",
    loaders: ["neoforge"],
    combinable: true,
  },
  {
    id: "architectury",
    name: "Architectury",
    kind: "mod",
    description:
      "Architectury multi-loader skeleton (common + fabric + forge subprojects in one build).",
    buildSystem: "gradle",
    loaders: ["fabric", "forge"],
    combinable: true,
  },
  {
    id: "spigot",
    name: "Spigot",
    kind: "plugin",
    description: "Spigot/Bukkit plugin skeleton (Maven + plugin.yml).",
    buildSystem: "maven",
    loaders: ["spigot"],
    combinable: false,
  },
  {
    id: "paper",
    name: "Paper",
    kind: "plugin",
    description: "Paper plugin skeleton (Gradle + paper-plugin.yml).",
    buildSystem: "gradle",
    loaders: ["paper"],
    combinable: false,
  },
  {
    id: "folia",
    name: "Folia",
    kind: "plugin",
    description: "Folia plugin skeleton (Gradle + plugin.yml, regionised threading aware).",
    buildSystem: "gradle",
    loaders: ["folia"],
    combinable: false,
  },
  {
    id: "velocity",
    name: "Velocity",
    kind: "proxy-plugin",
    description: "Velocity proxy plugin skeleton (Gradle + @Plugin annotation).",
    buildSystem: "gradle",
    loaders: ["velocity"],
    combinable: false,
  },
  {
    id: "bungeecord",
    name: "BungeeCord",
    kind: "proxy-plugin",
    description: "BungeeCord proxy plugin skeleton (Maven + bungee.yml).",
    buildSystem: "maven",
    loaders: ["bungeecord"],
    combinable: false,
  },
];

/** The platform ids, in catalog order. */
export const PLATFORM_IDS: readonly string[] = MINECRAFT_PLATFORMS.map((p) => p.id);

/** Looks a platform up by id (undefined when unknown). */
export function getPlatform(id: string): MinecraftPlatform | undefined {
  return MINECRAFT_PLATFORMS.find((platform) => platform.id === id);
}

/** Looks a project kind up by id. */
export function getProjectKind(id: string): MinecraftProjectKindInfo | undefined {
  return MINECRAFT_PROJECT_KINDS.find((kind) => kind.id === id);
}

/** Looks a module kind up by id. */
export function getModuleKind(id: string): MinecraftModuleKindInfo | undefined {
  return MINECRAFT_MODULES.find((module) => module.id === id);
}

/** Platforms of one kind, in catalog order. */
export function platformsForKind(kind: MinecraftProjectKind): MinecraftPlatform[] {
  return MINECRAFT_PLATFORMS.filter((platform) => platform.kind === kind);
}

/** Every loader id understood by the catalog, with the platforms that use it. */
export function platformsForLoader(loader: string): MinecraftPlatform[] {
  return MINECRAFT_PLATFORMS.filter((platform) => platform.loaders.includes(loader));
}
