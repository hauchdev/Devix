# Devix — Roadmap

Phase-by-phase project plan. Each phase ships **working, verifiable software**. We do not move to the next phase while the current one is broken.

**How to read this:** `[x]` completed and verified · `[ ]` pending. Status is updated when a phase closes.

---

## Current status

```text
Current phase: FASE 10 — Hygiene and technical debt
Last phase:    FASE 8 — Plugin System ✓ (minimal API + plugin list)
Goal:          v1.0.0 (stable platform) + web and AI plugins
```

| Phase                 | Target version | Status         |
| --------------------- | -------------- | -------------- |
| 0 — Foundation        | 0.1.x          | ✅ Completed   |
| 1 — Core Architecture | 0.2.x          | ✅ Completed   |
| 2 — Project Detector  | 0.3.x          | ✅ Completed   |
| 3 — CLI               | 0.4.x          | ✅ Completed   |
| 4 — Doctor            | 0.5.x          | ✅ Completed   |
| 5 — Git               | 0.6.x          | ✅ Completed   |
| 6 — Dependencies      | 0.7.x          | ✅ Completed   |
| 7 — Docker            | 0.8.x          | ✅ Completed   |
| 8 — Plugin System     | 0.9.x          | ✅ Completed   |
| 9 — Release 1.0 prep  | 1.0.0          | ✅ Completed   |
| 10 — Hygiene          | 0.4.x          | 🔵 In progress |
| 11 — Real platform    | 0.5.x          | `[ ]`          |
| 12 — Quality & CI     | 0.5.x          | `[ ]`          |
| 13 — Docker depth     | 0.6.x          | `[ ]`          |
| 14 — Web              | 0.7.x          | `[ ]`          |
| 15 — Minecraft depth  | 0.7.x          | `[ ]`          |
| 16 — Own AI           | 0.8.x          | `[ ]`          |

> FASE 9 is considered closed in terms of preparation: CI, release, README and docs are ready. The `1.0.0` version bump will happen once FASE 11 APIs are stable.

---

## FASE 0 — Foundation ✅

Monorepo foundation. Everything else builds on top of this.

```text
[x] pnpm workspace (apps/*, packages/*, plugins/*)
[x] Turborepo: build, dev, test, lint, typecheck, clean
[x] Strict TypeScript (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
[x] ESLint 9 (flat config) + Prettier
[x] Vitest with minimal tests in core and logger
[x] Changesets configured (@changesets/cli + .changeset/config.json)
[x] @devix-cli/core (base)
[x] @devix-cli/logger (base)
[x] DEVELOPMENT.md verified
[x] GitHub Actions CI (cross-cutting, see CI section)
```

**Acceptance criteria:** `pnpm install && pnpm build && pnpm test && pnpm lint && pnpm typecheck` green. — **Verified.**

---

## FASE 1 — Core Architecture ✅

Fundamental packages that everyone else will use.

```text
[x] @devix-cli/filesystem  — read/write abstractions, existence checks, safe paths
    (exists/isFile/isDirectory, read/write, readJson, walkUp/findUp,
    resolveWithin, listDir/listDirSafe, typed FilesystemError;
    API revised; 30 tests)
[x] @devix-cli/shell       — controlled process execution (safe spawn, no shell concat)
    (runCommand with timeout/abort/output limit, which/commandExists,
    EUNSAFE_ARG guard for Windows .cmd/.bat shims; 26 tests)
[x] @devix-cli/config      — configuration loading (devix.config.json / devix.json)
    (loadConfig with upward walkUp and precedence devix.config.json > devix.json,
    strict JSON with no eval/dynamic import, shape validation rejecting unknown
    keys, empty file = empty config, typed ConfigError; 20 tests)
[x] AGENTS.md per package (root + core, logger, filesystem, shell, config)
[x] Tests per package (filesystem 30, shell 26, config 20; core and logger with
    minimal tests)
```

**Acceptance criteria:**

- Each package: own `package.json`, ESM, strict tsconfig, `build`/`test`/`lint`/`typecheck`.
- Internal dependencies only via `workspace:*`.
- `@devix-cli/filesystem` and `@devix-cli/shell` do not depend on each other; both may depend on `@devix-cli/core`.
- All root commands green with the new packages.

---

## FASE 2 — Project Detector ✅

Automatic detection of the current project's characteristics.

```text
[x] Extensible DetectorRegistry (stable id, deterministic order,
    duplicates and empty markers rejected with ProjectDetectorError)
[x] findProjectRoot(startDir, detectors) — declared markers, nearest upward wins
[x] detectProject(registry, { cwd }) → { root, isProject, detectors: Map }
[x] createDefaultRegistry + defaultDetectors
[x] Detectors: node, npm, pnpm, yarn, bun, typescript, git, docker, java,
    rust, python, fabric, quilt, forge, neoforge, bukkit, bungeecord,
    velocity, sponge
[x] summarizeProject() groups by languages, packageManagers, tools
[x] detectMinecraftPlatforms() composes minecraft-category detectors
[x] Committed fixtures + integration test (109 tests in the package)
```

**Acceptance criteria:** adding a new detector does not require touching existing ones; fixtures cover the main package managers.

---

## FASE 3 — CLI ✅

Command-line interface bootstrap.

```text
[x] apps/cli with oclif (v5, pattern discovery over dist/commands)
[x] devix (help by default)
[x] devix --help / devix --version
[x] Working bin via node apps/cli/bin/run.js
[x] devix detect
[x] Cold-start budget test
```

**Acceptance criteria:** fast startup (<300ms cold start), clear help, correct exit codes.

---

## FASE 4 — Doctor ✅

```text
[x] Doctor service decoupled from the command (CLI only coordinates)
[x] Environment section: Node.js, pnpm/npm/yarn/bun, Git (detected versions)
[x] Project section: uses @devix-cli/project-detector
[x] Readable output with ✓/✗ and status summary
[x] Service tests with injectable detectors (no dependency on the real system)
```

**Acceptance criteria:** `devix doctor` correctly reflects the state of this repo and of an empty directory.

---

## FASE 5 — Git ✅

```text
[x] @devix-cli/git over @devix-cli/shell (without reinventing Git)
[x] devix git status / branches / diff / sync
[x] Never run destructive commands without explicit confirmation
[x] Handles: no-repo, missing git, localized output (parse only what's needed)
```

---

## FASE 6 — Dependencies ✅

```text
[x] Automatic package manager detection (reuses project-detector)
[x] devix deps list / outdated / audit
[x] Delegate to detected manager (pnpm outdated, npm outdated…), no custom registry parsing
```

---

## FASE 7 — Docker ✅

```text
[x] plugins/docker decoupled from core
[x] devix docker status / ps / images
[x] Graceful degradation when Docker is not installed
[ ] devix docker compose (see FASE 13)
```

---

## FASE 8 — Plugin System ✅

```text
[x] Minimal plugin API: register manifests with id, name, version, description
[x] devix plugin list
[x] Shape validation and duplicate rejection
[x] No arbitrary code execution without control (security first)
[ ] Real capabilities: commands, doctor checks, detectors, hooks (see FASE 11)
[ ] plugin install / remove (post-1.0)
```

**Partial acceptance criteria:** the docker plugin registers without changes in core.

---

## FASE 9 — Release 1.0 prep ✅

```text
[x] CI stable and green
[x] Automated release with Changesets
[x] User-oriented README.md
[x] Docs: architecture/, cli/, plugins/, project-detection/
[ ] 1.0.0 versions of public packages (final bump after FASE 11)
```

---

## FASE 10 — Hygiene and technical debt 🔵

Pay off documentation debt and dead code before moving the architecture.

```text
[ ] README.md: package table without broken columns
[ ] DEVELOPMENT.md: tables and @devix-cli/* scope references updated
[ ] ROADMAP.md: single coherent source of truth
[ ] Missing AGENTS.md for git, doctor, deps, plugins/docker, plugins/minecraft
[ ] Empty directories: packages/testing, plugins/github, tests/
[ ] default: process.cwd() → default: async () => process.cwd() in flags
[ ] Remove dead void join(flags.cwd) in docker.ts
[ ] git/index.ts: list sync in help
[ ] deps.ts: deduplicate dynamic imports
[ ] Root scripts: verify and format:check
[ ] CONTRIBUTING.md: short rules for agents/contributors
[ ] Deprecate @devix-cli/logger (changeset) and remove from linked packages
```

**Acceptance criteria:**

- `pnpm verify` green.
- No broken markdown tables.
- No `void join` or duplicated imports.
- Every package has its `AGENTS.md` (private, not tracked).

---

## FASE 11 — Real platform

Turn the "plugin system" into real extension points and unify the CLI experience.

```text
[ ] @devix-cli/output: canonical JSON { ok, data | error } and exit codes 0/1/2
[ ] DevixCommand base with --json, --cwd, --no-color, --quiet, --verbose, --config
[ ] Global + project config merged; devix config get|set|list|path
[ ] @devix-cli/cache: TTL in ~/.cache/devix for tool probes
[ ] PluginManifest with capabilities (commands, doctorChecks, detectors, hooks) and apiVersion
[ ] Own command registry: CLI resolves from manifests, not hardcoded imports
[ ] Migrate docker and minecraft to the capabilities API without touching their logic
```

**Acceptance criteria:** adding a new plugin = new package + manifest, **zero changes in apps/cli**. Docker and minecraft migrated.

> **Breaking change in 0.x:** the public API of `@devix-cli/core` changes. Documented as breaking in CHANGELOG and docs/plugins.md.

---

## FASE 12 — Quality & CI

```text
[ ] @vitest/coverage-v8 + shared vitest.config.ts + 80% thresholds
[ ] turbo.json: correct test outputs for real caching
[ ] In-process e2e harness (reduce 23 binary spawns)
[ ] CI: CodeQL, dependency-review, Dependabot/Renovate
[ ] npm publish --provenance + permissions hardening
[ ] Fix "Guard against workspace-only protocols" step in release.yml
```

---

## FASE 13 — Docker depth

```text
[ ] Compose v2 parsing: devix docker compose config|ps|logs|images
[ ] Read-only Dockerfile lint (FROM, USER, HEALTHCHECK, .dockerignore)
[ ] Per-container health, mapped ports, point-in-time stats
[ ] Mutating actions (up/down/prune): print-first, explicit --yes
```

---

## FASE 14 — Web

New `plugins/web` as the first real consumer of FASE 11 capabilities.

```text
[ ] Web detectors in project-detector: Next, Nuxt, Astro, SvelteKit, Remix, Vite, Angular, static
[ ] devix web detect
[ ] devix web env (variable names only, never secret values)
[ ] devix web scripts
[ ] devix web serve (static, --port)
[ ] devix web build (print-first, --run to execute)
[ ] devix web doctor
```

---

## FASE 15 — Minecraft depth

```text
[ ] Version catalog to catalog/versions.json + refresh script
[ ] Generate Gradle wrapper, .gitignore, LICENSE, README, CI, .editorconfig
[ ] devix minecraft run (print-first)
[ ] Java/Gradle checks via doctor capabilities
```

---

## FASE 16 — Own AI

Design is fixed in FASE 11; implementation comes later.

```text
[ ] Provider-agnostic AiProvider, local first (Ollama / llama.cpp)
[ ] Config is data: apiKeyEnv, never the key value
[ ] Explicit per-command consent + preview of what is sent
[ ] Print-first: AI proposes, Devix prints
[ ] Mandatory redactor (tokens, keys, emails, absolute paths)
[ ] Audit log in ~/.local/state/devix/ai.log
[ ] devix ai explain / doctor / fix-plan
```

---

## Cross-cutting work (continuous, does not block a phase)

```text
[x] CI (GitHub Actions): install → format → lint → typecheck → test → build
    Matrix: ubuntu-latest (Node 22, 24) + windows-latest (Node 22)
[x] AGENTS.md root + per subdirectory, updated with each phase
    (local working docs: not tracked in the repo, see .gitignore)
[ ] Changeset per user-facing change
[ ] CodeQL / security scanning
[ ] Coverage with thresholds
```

---

## Out of scope for now

Explicitly **not** planned until open phases are stable:

```text
devix railway / npm / vercel
Hauchdev ecosystem integrations (except own AI)
Manually controlled automatic release publishing
```

Any new idea enters this list until an open phase justifies it.

---

## Advance rules

A phase is considered closed when:

1. All its acceptance criteria pass.
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` is green.
3. `DEVELOPMENT.md` and `ROADMAP.md` reflect the new state.
4. There is at least one `feat(...)` conventional commit per functional unit.
