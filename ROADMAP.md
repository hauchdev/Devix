# Devix — Roadmap

Plan de fases del proyecto. Cada fase produce **software funcional y verificable**. No se avanza a la siguiente si la actual está rota.

**Cómo leerlo:** `[x]` completado y verificado · `[ ]` pendiente. El estado se actualiza al cerrar cada fase.

---

## Estado actual

```text
Fase actual:   FASE 1 — Core Architecture
Última fase:   FASE 0 — Foundation ✓
Objetivo:      v1.0 (plataforma estable)
```

| Fase                  | Versión objetivo | Estado          |
| --------------------- | ---------------- | --------------- |
| 0 — Foundation        | 0.1.x            | ✅ Completada   |
| 1 — Core Architecture | 0.2.x            | 🔵 **En curso** |
| 2 — Project Detector  | 0.3.x            | ⚪ Pendiente    |
| 3 — CLI               | 0.4.x            | ⚪ Pendiente    |
| 4 — Doctor            | 0.5.x            | ⚪ Pendiente    |
| 5 — Git               | 0.6.x            | ⚪ Pendiente    |
| 6 — Dependencies      | 0.7.x            | ⚪ Pendiente    |
| 7 — Docker            | 0.8.x            | ⚪ Pendiente    |
| 8 — Plugin System     | 0.9.x            | ⚪ Pendiente    |
| 9 — Release 1.0       | 1.0.0            | ⚪ Pendiente    |

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
[x] @devix/core (base)
[x] @devix/logger (base)
[x] DEVELOPMENT.md verificada
[x] GitHub Actions CI (transversal, ver sección CI)
```

**Criterio de aceptación:** `pnpm install && pnpm build && pnpm test && pnpm lint && pnpm typecheck` en verde. — **Verificado.**

---

## FASE 1 — Core Architecture 🔵

Paquetes fundamentales que usarán todos los demás.

```text
[x] @devix/filesystem  — abstracciones de lectura/escritura, existencia, rutas seguras
    (exists/isFile/isDirectory, read/write, readJson, walkUp/findUp,
    resolveWithin, listDir/listDirSafe, errores tipados FilesystemError;
    API revisada (symlinks, traversal case-safe); 30 tests, 0 fixtures commitados — tmpdir en tests)
[x] @devix/shell       — ejecución controlada de procesos (spawn seguro, sin shell concat)
    (runCommand con timeout/abort/límite de salida, which/commandExists sin
    spawn, guard EUNSAFE_ARG para shims .cmd/.bat de Windows; 26 tests)
[ ] @devix/config      — carga de configuración (devix.config.ts / devix.json)
[ ] AGENTS.md por paquete
[ ] Tests por paquete (incluyendo casos de error y multiplataforma)
```

**Criterios de aceptación:**

- Cada paquete: `package.json` propio, ESM, tsconfig estricto, `build`/`test`/`lint`/`typecheck`.
- Dependencias internas solo con `workspace:*`.
- `@devix/filesystem` y `@devix/shell` no dependen entre sí; ambas pueden depender de `@devix/core`.
- Todos los comandos raíz en verde con los nuevos paquetes.

---

## FASE 2 — Project Detector

Detección automática de características del proyecto actual.

```text
[ ] packages/project-detector con detectores independientes:
    node, npm, pnpm, yarn, bun, typescript, git, docker,
    java (maven/gradle), rust (cargo), python
[ ] API: detectProject(cwd) → { root, languages, packageManagers, tools, git, docker }
[ ] Extensible: registro de detectores, no if/else gigante
[ ] Fixtures en tests/fixtures/ (node-project, pnpm-project, rust-project, java-project, docker-project…)
[ ] Tests: casos normales, vacíos, inexistentes, inválidos
```

**Criterios de aceptación:** añadir un detector nuevo no requiere tocar los existentes; fixtures cubren los gestores de paquetes principales.

---

## FASE 3 — CLI

Bootstrap de la interfaz de línea de comandos.

```text
[ ] apps/cli con oclif
[ ] devix (help por defecto)
[ ] devix --help / devix --version
[ ] bin funcional vía pnpm link o npx desde el repo
```

**Criterios de aceptación:** arranque rápido (<300ms en frío razonable), help claro, códigos de salida correctos. Sin `doctor` todavía.

---

## FASE 4 — Doctor

Primer comando real de Devix.

```text
[ ] Servicio Doctor desacoplado del comando (CLI solo coordina)
[ ] Sección Environment: Node.js, pnpm/npm/yarn/bun, Git (versiones detectadas)
[ ] Sección Project: usa @devix/project-detector
[ ] Salida legible con ✓/✗ y resumen de estado
[ ] Tests del servicio con inyección de detectores (sin depender del sistema real)
```

**Criterios de aceptación:** `devix doctor` refleja correctamente el estado de este mismo repo y de un proyecto vacío.

---

## FASE 5 — Git

```text
[ ] @devix/git sobre @devix/shell (sin reinventar Git)
[ ] devix git status / branches / diff / sync
[ ] Nunca ejecutar comandos destructivos sin confirmación explícita
[ ] Manejo de: no-repo, git ausente, salida localizada (parsear solo lo necesario)
```

---

## FASE 6 — Dependencies

```text
[ ] Detección automática del package manager (reusa project-detector)
[ ] devix deps / deps outdated / deps audit / deps update
[ ] Delegar en el gestor detectado (pnpm outdated, npm outdated…), no implementar parseo propio de registries
```

---

## FASE 7 — Docker

```text
[ ] plugins/docker desacoplado del core
[ ] devix docker status / ps / images / compose
[ ] Degradación elegante si Docker no está instalado
```

---

## FASE 8 — Plugin System

```text
[ ] API de plugins mínima: registrar comandos, hooks y configuración
[ ] devix plugin list / install / remove
[ ] Descubrimiento local + paquetes npm con convención de nombre
[ ] Sin ejecución de código arbitrario sin control (seguridad primero)
```

**Criterios de aceptación:** el docker plugin migra a la API de plugins sin cambios en core.

---

## FASE 9 — Release 1.0

```text
[ ] CI estable en verde de forma sostenida
[ ] Release automatizado con Changesets
[ ] README.md orientado a usuarios
[ ] Docs: architecture/, cli/, plugins/, project-detection/
[ ] Versiones 1.0.0 de los paquetes públicos
```

---

## Trabajo transversal (continuo, no bloquea una fase)

```text
[x] CI (GitHub Actions): install → format → lint → typecheck → test → build
    Matriz: ubuntu-latest (Node 22, 24) + windows-latest (Node 22)
    .github/workflows/ci.yml — se ejecuta en push a main y en cada PR
[ ] AGENTS.md raíz + por subdirectorio, actualizados con cada fase
[ ] Changeset por cambio que afecte a usuarios
[ ] CodeQL / security scanning (cuando el CI esté estable)
```

El resto de tareas transversales se incorporan con la fase en la que resulten necesarias.

---

## Fuera de alcance por ahora

Explícitamente **no** planificado hasta que las fases anteriores estén estables:

```text
devix minecraft / railway / npm / vercel / ai
Integraciones con el ecosistema Hauchdev
Publicación automática de releases
```

Cualquier idea nueva entra por esta lista hasta que una fase abierta la justifique.

---

## Reglas de avance

Una fase se considera cerrada cuando:

1. Todos sus criterios de aceptación pasan.
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en verde.
3. `DEVELOPMENT.md` y `ROADMAP.md` reflejan el nuevo estado.
4. Existe al menos un commit `feat(...)` convencional por unidad de funcionalidad.
