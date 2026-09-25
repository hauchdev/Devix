# Plugins

Devix plugins extend the CLI with optional integrations. The system is intentionally minimal and security-first.

## Design principles

1. **Plugins are metadata, not dynamic code.** The core API (`@devix-cli/core`) registers and validates manifests; it never `eval`s, never `new Function`s and never dynamically imports plugin code. Loading third-party code is a deliberate human decision, out of scope for the registry.
2. **The CLI owns dispatch.** A plugin declares which commands it contributes; the CLI decides how they are exposed.
3. **Graceful degradation.** Integrations like Docker report their unavailability instead of throwing.

## The manifest

```ts
import type { PluginManifest } from "@devix-cli/core";

const dockerPlugin: PluginManifest = {
  id: "docker", // kebab-case, stable
  name: "Docker",
  version: "0.0.1", // semantic versioning
  description: "Docker diagnostics: availability, containers and images.",
  commands: ["docker"], // declared for discoverability
};
```

## The registry

```ts
import { PluginRegistry, PluginError } from "@devix-cli/core";

const registry = new PluginRegistry((message) => PluginError.invalid(message));
registry.register(dockerPlugin);

registry.ids(); // ["docker"]
registry.has("docker"); // true
```

Registration validates the manifest shape (id pattern, semver version, non-empty name and description) and rejects duplicate ids with `PluginError`.

## Built-in plugins

| Plugin   | Commands       | What it adds                                              |
| -------- | -------------- | --------------------------------------------------------- |
| `docker` | `devix docker` | Availability probing, running containers and local images |

## Writing an integration

A plugin ships two parts:

1. **A service package** under `plugins/<name>` with the business logic, typed errors and tests. See [`@devix-cli/docker`](../plugins/docker) for the graceful-degradation pattern: probe first, return `undefined` or an availability report when the tool is absent.
2. **A manifest** added to the CLI's builtin registry (`apps/cli/src/lib/builtin-plugins.ts`) and, when user-facing, a command under `apps/cli/src/commands/`.

## Roadmap

Installing third-party plugins (`devix plugin install <package>`) is planned after 1.0 and will require explicit user confirmation plus a security review of the loading mechanism — until then, plugins ship with Devix itself.
