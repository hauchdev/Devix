import type { PluginCommandCapability } from "@devix-cli/core";
import type { CommandHandler } from "@devix-cli/output";

import { BUILTIN_PLUGIN_MANIFESTS, createPluginRegistry } from "./builtin-plugins.js";

/** A registered plugin command and its lazy loader. */
export interface PluginCommandEntry {
  readonly commandId: string;
  readonly description: string;
  readonly load: () => Promise<CommandHandler>;
}

/**
 * Registry of commands contributed by built-in plugins. The CLI uses this
 * to discover and load plugin-provided command handlers without hardcoding
 * imports in command files.
 */
export class PluginCommandRegistry {
  private readonly entries = new Map<string, PluginCommandEntry>();

  constructor() {
    const registry = createPluginRegistry().registerAll(BUILTIN_PLUGIN_MANIFESTS);
    for (const plugin of registry.all()) {
      const capabilities = plugin.manifest.capabilities?.commands ?? [];
      for (const command of capabilities) {
        this.register(command);
      }
    }
  }

  private register(capability: PluginCommandCapability): void {
    if (this.entries.has(capability.id)) {
      throw new Error(`duplicate plugin command id: ${capability.id}`);
    }

    const exportName = capability.export ?? "commandHandlers";
    this.entries.set(capability.id, {
      commandId: capability.id,
      description: capability.description,
      load: async () => {
        const module = (await import(capability.module)) as Record<string, unknown>;
        const handlers = module[exportName];
        if (handlers === undefined || typeof handlers !== "object" || handlers === null) {
          throw new Error(
            `plugin command ${capability.id} missing handlers export '${exportName}' from ${capability.module}`,
          );
        }
        const handler = (handlers as Record<string, unknown>)[capability.id];
        if (typeof handler !== "function") {
          throw new Error(
            `plugin command ${capability.id} missing handler '${capability.id}' in ${capability.module}`,
          );
        }
        return handler as CommandHandler;
      },
    });
  }

  /** All registered plugin command ids. */
  ids(): readonly string[] {
    return [...this.entries.keys()];
  }

  /** Load a handler by command id. */
  async load(commandId: string): Promise<CommandHandler> {
    const entry = this.entries.get(commandId);
    if (entry === undefined) {
      throw new Error(`unknown plugin command: ${commandId}`);
    }
    return entry.load();
  }

  /** True when the registry knows the command id. */
  has(commandId: string): boolean {
    return this.entries.has(commandId);
  }

  /** Metadata of all registered commands. */
  metadata(): readonly { readonly id: string; readonly description: string }[] {
    return [...this.entries.values()].map((entry) => ({
      id: entry.commandId,
      description: entry.description,
    }));
  }
}

/** Shared registry instance. */
export const pluginCommandRegistry = new PluginCommandRegistry();
