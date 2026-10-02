# @devix-cli/output

## 1.0.0

### Minor Changes

- cf65db9: Migrate `devix docker` and the read-only `devix minecraft list|check|run` subcommands to plugin-contributed handlers loaded through the capability registry. The `init` subcommand remains in the CLI because it depends on interactive prompts. Added `CommandHandler` and `CommandHandlers` types to `@devix-cli/output`.
- 45f5cc9: Introduce `@devix-cli/output` with canonical `{ ok, data | error }` command output shapes, exit codes (`Success`, `Failure`, `Unexpected`) and JSON formatting helpers.

### Patch Changes

- Updated dependencies [048d318]
- Updated dependencies [6e9c4f7]
  - @devix-cli/core@1.0.0
