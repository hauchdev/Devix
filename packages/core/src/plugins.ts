/**
 * Minimal plugin API for Devix (PHASE 8).
 *
 * Security posture: plugins are manifest metadata only. This API never
 * loads dynamic code — installing a plugin is a human decision, and
 * registration only validates shapes. Data is data, never code.
 */

/** What a Devix plugin declares about itself. */
export interface PluginManifest {
  /** Stable plugin id, e.g. "docker". */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Semantic version of the plugin. */
  readonly version: string;
  /** One-line description of what the plugin adds. */
  readonly description: string;
  /**
   * Command names the plugin contributes, e.g. ["docker"]. Declared
   * for discoverability only: the CLI owns command dispatch.
   */
  readonly commands?: readonly string[];
}

/** A registered plugin: its manifest plus its registered entry. */
export interface RegisteredPlugin {
  readonly manifest: PluginManifest;
}

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Validates a manifest's shape and throws PluginError on bad input. */
function assertValidManifest(manifest: PluginManifest, pluginError: PluginErrorFactory): void {
  if (typeof manifest.id !== "string" || !ID_PATTERN.test(manifest.id)) {
    throw pluginError(`plugin id must match ${ID_PATTERN.source}: ${String(manifest.id)}`);
  }
  if (typeof manifest.name !== "string" || manifest.name.trim().length === 0) {
    throw pluginError(`plugin name must be a non-empty string: ${manifest.id}`);
  }
  if (typeof manifest.version !== "string" || !SEMVER_PATTERN.test(manifest.version)) {
    throw pluginError(
      `plugin version must be semantic versioning: ${manifest.id} ${String(manifest.version)}`,
    );
  }
  if (typeof manifest.description !== "string" || manifest.description.trim().length === 0) {
    throw pluginError(`plugin description must be a non-empty string: ${manifest.id}`);
  }
}

/** Minimal error factory so core stays dependency-free. */
export interface PluginErrorFactory {
  (message: string): Error;
}

/**
 * Registry of Devix plugins, keyed by stable plugin id. Registration
 * order is preserved for deterministic listings.
 */
export class PluginRegistry {
  private readonly byId = new Map<string, RegisteredPlugin>();
  private readonly order: string[] = [];
  private readonly pluginError: PluginErrorFactory;

  constructor(pluginError: PluginErrorFactory) {
    this.pluginError = pluginError;
  }

  /** Registers a plugin manifest; throws on duplicates or bad shapes. */
  register(manifest: PluginManifest): this {
    assertValidManifest(manifest, this.pluginError);
    if (this.byId.has(manifest.id)) {
      throw this.pluginError(`plugin already registered: ${manifest.id}`);
    }
    this.byId.set(manifest.id, { manifest });
    this.order.push(manifest.id);
    return this;
  }

  /** Registers several manifests in order. */
  registerAll(manifests: readonly PluginManifest[]): this {
    for (const manifest of manifests) {
      this.register(manifest);
    }
    return this;
  }

  /** True when a plugin with the given id is registered. */
  has(id: string): boolean {
    return this.byId.has(id);
  }

  /** Registered plugin ids, in registration order. */
  ids(): readonly string[] {
    return [...this.order];
  }

  /** All registered plugins, in registration order. */
  all(): readonly RegisteredPlugin[] {
    return this.order.map((id) => {
      const plugin = this.byId.get(id);
      if (plugin === undefined) {
        throw this.pluginError(`plugin registry inconsistency: ${id}`);
      }
      return plugin;
    });
  }
}
