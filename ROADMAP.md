# Devix — Roadmap

Plan de fases del proyecto. Cada fase produce **software funcional y verificable**. No se avanza a la siguiente si la actual está rota.

**Cómo leerlo:** `[x]` completado y verificado · `[ ]` pendiente. El estado se actualiza al cerrar cada fase.

---

## Estado actual

```text
Fase actual:   FASE 10 — Higiene y deuda técnica
Última fase:   FASE 8 — Plugin System ✓ (API mínima + plugin list)
Objetivo:      v1.0.0 (plataforma estable) + plugins web e IA
```

| Fase                   | Versión objetivo | Estado        |
| ---------------------- | ---------------- | ------------- |
| 0 — Foundation         | 0.1.x            | ✅ Completada |
| 1 — Core Architecture  | 0.2.x            | ✅ Completada |
| 2 — Project Detector   | 0.3.x            | ✅ Completada |
| 3 — CLI                | 0.4.x            | ✅ Completada |
| 4 — Doctor             | 0.5.x            | ✅ Completada |
| 5 — Git                | 0.6.x            | ✅ Completada |
| 6 — Dependencies       | 0.7.x            | ✅ Completada |
| 7 — Docker             | 0.8.x            | ✅ Completada |
| 8 — Plugin System      | 0.9.x            | ✅ Completada |
| 9 — Release 1.0 prep   | 1.0.0            | ✅ Completada |
| 10 — Higiene y deuda   | 0.4.x            | 🔵 En curso   |
| 11 — Plataforma real   | 0.5.x            | `[ ]`         |
| 12 — Calidad y CI      | 0.5.x            | `[ ]`         |
| 13 — Docker a fondo    | 0.6.x            | `[ ]`         |
| 14 — Web               | 0.7.x            | `[ ]`         |
| 15 — Minecraft a fondo | 0.7.x            | `[ ]`         |
| 16 — IA propia         | 0.8.x            | `[ ]`         |

> FASE 9 se considera cerrada en términos de preparación: CI, release, README y docs están listos. El bump a `1.0.0` se hará cuando las APIs de la FASE 11 sean estables.

---

## FASE 0 — Foundation ✅

Base del monorepo. Todo lo demás se construye sobre esto.

```text
[x] pnpm workspace (apps/*, packages/*, plugins/*)
[x] Turborepo: build, dev, test, lint, typecheck, clean
[x] TypeScript estricto (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
[x] ESLint 9 (flat config) + Prettier
[x] Vitest con tests mínimos en core y logger
[x] Changesets configurado (@changesets/cli + .changeset/config.json)
[x] @devix-cli/core (base)
[x] @devix-cli/logger (base)
[x] DEVELOPMENT.md verificada
[x] GitHub Actions CI (transversal, ver sección CI)
```

**Criterio de aceptación:** `pnpm install && pnpm build && pnpm test && pnpm lint && pnpm typecheck` en verde. — **Verificado.**

---

## FASE 1 — Core Architecture ✅

Paquetes fundamentales que usarán todos los demás.

```text
[x] @devix-cli/filesystem  — abstracciones de lectura/escritura, existencia, rutas seguras
    (exists/isFile/isDirectory, read/write, readJson, walkUp/findUp,
    resolveWithin, listDir/listDirSafe, errores tipados FilesystemError;
    API revisada; 30 tests)
[x] @devix-cli/shell       — ejecución controlada de procesos (spawn seguro, sin shell concat)
    (runCommand con timeout/abort/límite de salida, which/commandExists,
    guard EUNSAFE_ARG para shims .cmd/.bat de Windows; 26 tests)
[x] @devix-cli/config      — carga de configuración (devix.config.json / devix.json)
    (loadConfig con búsqueda walkUp y precedencia devix.config.json > devix.json,
    JSON estricto sin eval/import dinámico, validación de forma con claves
    desconocidas rechazadas, fichero vacío = config vacía, errores tipados
    ConfigError; 20 tests)
[x] AGENTS.md por paquete (raíz + core, logger, filesystem, shell, config)
[x] Tests por paquete (filesystem 30, shell 26, config 20; core y logger con
    tests mínimos)
```

**Criterios de aceptación:**

- Cada paquete: `package.json` propio, ESM, tsconfig estricto, `build`/`test`/`lint`/`typecheck`.
- Dependencias internas solo con `workspace:*`.
- `@devix-cli/filesystem` y `@devix-cli/shell` no dependen entre sí; ambas pueden depender de `@devix-cli/core`.
- Todos los comandos raíz en verde con los nuevos paquetes.

---

## FASE 2 — Project Detector ✅

Detección automática de características del proyecto actual.

```text
[x] DetectorRegistry extensible (id estable, orden determinista,
    duplicados y markers vacíos rechazados con ProjectDetectorError)
[x] findProjectRoot(startDir, detectors) — markers declarados por los
    detectores, el más cercano hacia arriba gana
[x] detectProject(registry, { cwd }) → { root, isProject, detectors: Map }
[x] createDefaultRegistry + defaultDetectors
[x] Detectores: node, npm, pnpm, yarn, bun, typescript, git, docker, java,
    rust, python, fabric, quilt, forge, neoforge, bukkit, bungeecord,
    velocity, sponge
[x] summarizeProject() agrupa por languages, packageManagers, tools
[x] detectMinecraftPlatforms() compone detectores de categoría minecraft
[x] Fixtures commitadas + test de integración (109 tests en el paquete)
```

**Criterios de aceptación:** añadir un detector nuevo no requiere tocar los existentes; fixtures cubren los gestores de paquetes principales.

---

## FASE 3 — CLI ✅

Bootstrap de la interfaz de línea de comandos.

```text
[x] apps/cli con oclif (v5, descubrimiento pattern sobre dist/commands compilado)
[x] devix (help por defecto)
[x] devix --help / devix --version
[x] bin funcional vía node apps/cli/bin/run.js
[x] devix detect
[x] Test de presupuesto de arranque
```

**Criterios de aceptación:** arranque rápido (<300ms en frío razonable), help claro, códigos de salida correctos.

---

## FASE 4 — Doctor ✅

```text
[x] Servicio Doctor desacoplado del comando (CLI solo coordina)
[x] Sección Environment: Node.js, pnpm/npm/yarn/bun, Git (versiones detectadas)
[x] Sección Project: usa @devix-cli/project-detector
[x] Salida legible con ✓/✗ y resumen de estado
[x] Tests del servicio con inyección de detectores (sin depender del sistema real)
```

**Criterios de aceptación:** `devix doctor` refleja correctamente el estado de este mismo repo y de un proyecto vacío.

---

## FASE 5 — Git ✅

```text
[x] @devix-cli/git sobre @devix-cli/shell (sin reinventar Git)
[x] devix git status / branches / diff / sync
[x] Nunca ejecutar comandos destructivos sin confirmación explícita
[x] Manejo de: no-repo, git ausente, salida localizada (parsear solo lo necesario)
```

---

## FASE 6 — Dependencies ✅

```text
[x] Detección automática del package manager (reusa project-detector)
[x] devix deps list / outdated / audit
[x] Delegar en el gestor detectado (pnpm outdated, npm outdated…), sin parseo propio de registries
```

---

## FASE 7 — Docker ✅

```text
[x] plugins/docker desacoplado del core
[x] devix docker status / ps / images
[x] Degradación elegante si Docker no está instalado
[ ] devix docker compose (ver FASE 13)
```

---

## FASE 8 — Plugin System ✅

```text
[x] API de plugins mínima: registrar manifests con id, nombre, versión, descripción
[x] devix plugin list
[x] Validación de shapes y rechazo de duplicados
[x] Sin ejecución de código arbitrario sin control (seguridad primero)
[ ] Capacidades reales: comandos, doctor checks, detectores, hooks (ver FASE 11)
[ ] plugin install / remove (post-1.0)
```

**Criterio de aceptación parcial:** el docker plugin se registra sin cambios en core.

---

## FASE 9 — Release 1.0 prep ✅

```text
[x] CI estable en verde de forma sostenida
[x] Release automatizado con Changesets
[x] README.md orientado a usuarios
[x] Docs: architecture/, cli/, plugins/, project-detection/
[ ] Versiones 1.0.0 de los paquetes públicos (bump final tras FASE 11)
```

---

## FASE 10 — Higiene y deuda técnica 🔵

Pagar la deuda documental y de código muerto antes de mover la arquitectura.

```text
[ ] README.md: tabla de paquetes sin columnas rotas
[ ] DEVELOPMENT.md: tablas y referencias de scope @devix-cli/* actualizadas
[ ] ROADMAP.md: fuente de verdad coherente
[ ] AGENTS.md faltantes en git, doctor, deps, plugins/docker, plugins/minecraft
[ ] Directorios vacíos: packages/testing, plugins/github, tests/
[ ] default: process.cwd() → default: async () => process.cwd() en flags
[ ] Borrar void join(flags.cwd) muerto en docker.ts
[ ] git/index.ts: listar sync en el help
[ ] deps.ts: deduplicar imports dinámicos
[ ] Scripts raíz: verify y format:check
[ ] CONTRIBUTING.md: reglas cortas para agentes/contribuidores
[ ] Deprecar @devix-cli/logger (changeset) y quitarlo de linked packages
```

**Criterios de aceptación:**

- `pnpm verify` en verde.
- Sin tablas markdown rotas.
- Sin `void join` ni imports duplicados.
- Todos los paquetes tienen su `AGENTS.md` (privado, no tracked).

---

## FASE 11 — Plataforma real

Convertir el "plugin system" en una extensión real y unificar la experiencia de CLI.

```text
[ ] @devix-cli/output: JSON canónico { ok, data | error } y exit codes 0/1/2
[ ] DevixCommand base con --json, --cwd, --no-color, --quiet, --verbose, --config
[ ] Config global + de proyecto mergeada; devix config get|set|list|path
[ ] @devix-cli/cache: TTL en ~/.cache/devix para sondeos de herramientas
[ ] PluginManifest con capabilities (commands, doctorChecks, detectors, hooks) y apiVersion
[ ] Registro de comandos propio: el CLI resuelve desde manifests, no imports hardcodeados
[ ] Migrar docker y minecraft a la API de capacidades sin tocar su lógica
```

**Criterios de aceptación:** añadir un plugin nuevo = paquete nuevo + manifest, **cero cambios en apps/cli**. Docker y minecraft migrados.

> **Breaking change en 0.x:** la API pública de `@devix-cli/core` cambia. Se documenta como incompatible en CHANGELOG y docs/plugins.md.

---

## FASE 12 — Calidad y CI

```text
[ ] @vitest/coverage-v8 + vitest.config.ts compartido + umbrales 80%
[ ] turbo.json: outputs correctos en test para cacheo real
[ ] Harness e2e en proceso (reducir 23 spawns del binario)
[ ] CI: CodeQL, dependency-review, Dependabot/Renovate
[ ] npm publish --provenance + permissions hardening
[ ] Arreglar step "Guard against workspace-only protocols" en release.yml
```

---

## FASE 13 — Docker a fondo

```text
[ ] Parseo de compose v2: devix docker compose config|ps|logs|images
[ ] Dockerfile lint read-only (FROM, USER, HEALTHCHECK, .dockerignore)
[ ] Salud por contenedor, puertos mapeados, stats puntual
[ ] Acciones mutantes (up/down/prune): print-first, --yes explícito
```

---

## FASE 14 — Web

Nuevo `plugins/web` como primer consumidor real de las capacidades de la FASE 11.

```text
[ ] Detectores web en project-detector: Next, Nuxt, Astro, SvelteKit, Remix, Vite, Angular, estático
[ ] devix web detect
[ ] devix web env (nombres de variables, nunca valores secretos)
[ ] devix web scripts
[ ] devix web serve (estático, --port)
[ ] devix web build (print-first, --run para ejecutar)
[ ] devix web doctor
```

---

## FASE 15 — Minecraft a fondo

```text
[ ] Catálogo de versiones a catalog/versions.json + script de refresco
[ ] Generar Gradle wrapper, .gitignore, LICENSE, README, CI, .editorconfig
[ ] devix minecraft run (print-first)
[ ] Checks de Java/Gradle vía doctor capabilities
```

---

## FASE 16 — IA propia

El diseño se fija en FASE 11; la implementación es posterior.

```text
[ ] AiProvider agnóstico, local primero (Ollama / llama.cpp)
[ ] Config es datos: apiKeyEnv, nunca el valor de la clave
[ ] Consentimiento explícito por comando + preview de lo enviado
[ ] Print-first: la IA propone, Devix imprime
[ ] Redactor obligatorio (tokens, claves, emails, rutas absolutas)
[ ] Auditoría en ~/.local/state/devix/ai.log
[ ] devix ai explain / doctor / fix-plan
```

---

## Trabajo transversal (continuo, no bloquea una fase)

```text
[x] CI (GitHub Actions): install → format → lint → typecheck → test → build
    Matriz: ubuntu-latest (Node 22, 24) + windows-latest (Node 22)
[x] AGENTS.md raíz + por subdirectorio, actualizados con cada fase
    (documentación de trabajo local: no se rastrea en el repo, ver .gitignore)
[ ] Changeset por cambio que afecte a usuarios
[ ] CodeQL / security scanning
[ ] Coverage con umbrales
```

---

## Fuera de alcance por ahora

Explícitamente **no** planificado hasta que las fases abiertas estén estables:

```text
devix railway / npm / vercel
Integraciones con el ecosistema Hauchdev (salvo IA propia)
Publicación automática de releases manualmente controladas
```

Cualquier idea nueva entra por esta lista hasta que una fase abierta la justifique.

---

## Reglas de avance

Una fase se considera cerrada cuando:

1. Todos sus criterios de aceptación pasan.
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde.
3. `DEVELOPMENT.md` y `ROADMAP.md` reflejan el nuevo estado.
4. Existe al menos un commit `feat(...)` convencional por unidad de funcionalidad.
