import { DevixCommand, devixBaseFlags, field } from "../../lib/devix-command.js";

export default class PluginList extends DevixCommand {
  static override description = "List installed Devix plugins.";

  static override flags = devixBaseFlags;

  async run(): Promise<void> {
    const { flags } = await this.parse(PluginList);

    const { createPluginRegistry, BUILTIN_PLUGIN_MANIFESTS } = await import(
      "../../lib/builtin-plugins.js"
    );

    const registry = createPluginRegistry().registerAll(BUILTIN_PLUGIN_MANIFESTS);
    const plugins = registry.all().map((entry) => entry.manifest);

    if (flags.json) {
      this.log(JSON.stringify(plugins, null, 2));
      return;
    }

    const ui = this.renderer(flags);
    if (flags.quiet) {
      return;
    }

    ui.title("devix plugin list");
    ui.blank();

    if (plugins.length === 0) {
      ui.fields([field("Plugins", "none", "muted")]);
      ui.blank();
      return;
    }

    ui.heading("Installed plugins", { count: plugins.length });
    ui.fields(
      plugins.map((plugin) => {
        const capabilityCommands =
          plugin.capabilities?.commands?.map((command) => command.id) ?? [];
        const legacyCommands = plugin.commands ?? [];
        const commands = [...new Set([...capabilityCommands, ...legacyCommands])];

        return field(
          `${plugin.name}  ${plugin.version}`,
          commands.join(", ") || "no commands",
          "info",
          plugin.description,
        );
      }),
    );

    ui.blank();
    ui.footnote(`api version 1 · ${String(plugins.length)} plugins`);
    ui.blank();
  }
}
