# @devix-cli/minecraft

## 0.3.0

### Minor Changes

- Adds the `@devix-cli/minecraft` plugin: scaffolds Minecraft mod and plugin skeletons for eight platforms — fabric, forge, architectury (multi-loader common+fabric+forge), spigot, paper, folia, velocity and bungeecord — via the new `devix minecraft list` and `devix minecraft init` commands. Scaffolding never overwrites existing files (fails with `EEXISTS` unless `overwrite` is set, and then only skips), supports `--dry-run`, `--package`, `--mc` and `--json`, and the plugin appears in `devix plugin list`.
