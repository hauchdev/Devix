---
"@devix-cli/docker": minor
"@devix-cli/minecraft": minor
"@devix-cli/output": minor
"devix-cli": minor
---

Migrate `devix docker` and the read-only `devix minecraft list|check|run` subcommands to plugin-contributed handlers loaded through the capability registry. The `init` subcommand remains in the CLI because it depends on interactive prompts. Added `CommandHandler` and `CommandHandlers` types to `@devix-cli/output`.
