# Devix — Guía de desarrollo

Guía práctica para desarrollar, probar y mantener Devix.

> **Devix** es un toolkit modular para desarrolladores, construido como monorepo con TypeScript, pnpm y Turborepo.

---

## 1. Requisitos

| Herramienta | Versión    | Notas                                              |
| ----------- | ---------- | -------------------------------------------------- |
| Node.js     | LTS (22.x) | Runtime del proyecto                               |
| pnpm        | 12.5.1     | Fijado en `packageManager`; se activa con Corepack |
| Git         | 2.x        |                                                    |

Activar la versión de pnpm fijada:

```bash
corepack enable
corepack prepare pnpm@12.5.1 --activate
```

Comprobar instalación:

```bash
node --version   # v22.x
pnpm --version   # 12.5.1
git --version
```

---

## 2. Primeros pasos

```bash
git clone https://github.com/hauchdev/Devix.git
cd Devix
pnpm install
```

Verificar que todo funciona:

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Los cuatro comandos deben terminar sin errores antes de empezar a programar.

---

## 3. Comandos

Todos los comandos se ejecutan desde la raíz del repositorio.

| Comando          | Qué hace                                                   |
| ---------------- | ---------------------------------------------------------- | --- | ------------ | ------------------------------------- |
| `pnpm install`   | Instala dependencias de todo el workspace                  |
| `pnpm build`     | Compila todos los paquetes (orden respetando dependencias) |
| `pnpm test`      | Ejecuta los tests (Vitest)                                 |
| `pnpm lint`      | Analiza el código (ESLint)                                 |
| `pnpm typecheck` | Comprueba tipos sin emitir salida                          |
| `pnpm format`    | Formatea el código (Prettier)                              |     | `pnpm clean` | Elimina artefactos de build (`dist/`) |
| `pnpm dev`       | Reservado para watch del CLI (sin tareas todavía)          |

### CI (GitHub Actions)

`.github/workflows/ci.yml` se ejecuta en cada push a `main` y en cada Pull Request:

```text
install --frozen-lockfile → format check → lint → typecheck → test → build
```

Matriz: **ubuntu-latest** (Node 22 y 24) y **windows-latest** (Node 22) — Windows se comprueba en cada PR porque es plataforma objetivo de Devix. El workflow lee la versión de pnpm del campo `packageManager` y cachea `.turbo` por runner.

### Trabajar en un paquete concreto

Usa filtros de pnpm para no ejecutar todo el monorepo:

```bash
pnpm --filter @devix/core build
pnpm --filter @devix/core test
pnpm --filter @devix/core typecheck
```

### Añadir dependencias

```bash
# Dependencia de la raíz (tooling compartido)
pnpm add -Dw <paquete>

# Dependencia de un paquete concreto
pnpm --filter @devix/core add -D <paquete>

# Dependencia interna entre paquetes (siempre así)
pnpm --filter @devix/logger add @devix/core@workspace:*
```

> **Nota sobre pnpm estricto:** cada paquete solo puede importar lo que declara en su `package.json`. El tooling compartido (config de ESLint, TypeScript, Vitest) vive en la raíz; los paquetes declaran solo lo que ejecutan directamente (p. ej. el binario de `eslint`).

---

## 4. Estructura del monorepo

```text
Devix/
├── apps/
│   └── cli/                  # CLI de Devix (oclif) — pendiente (FASE 3)
│
├── packages/
│   ├── core/                 # Fundamentos compartidos ✓
│   ├── logger/               # Logging centralizado ✓
│   ├── config/               # Configuración — pendiente (FASE 1)
│   ├── filesystem/           # Abstracciones de FS ✓
│   ├── shell/                # Ejecución de procesos ✓
│   ├── project-detector/     # Detección de proyectos — pendiente (FASE 2)
│   ├── git/                  # Operaciones Git — pendiente (FASE 5)
│   └── testing/              # Utilidades de test — pendiente
│
├── plugins/                  # Integraciones opcionales (docker, github) — pendiente
├── docs/                     # Documentación específica — pendiente
├── tests/                    # Fixtures compartidos — pendiente
├── .changeset/               # Versionado y releases
├── .github/                  # CI — pendiente
│
├── turbo.json                # Orquestación Turborepo
├── tsconfig.json             # TypeScript base (estricto)
├── eslint.config.js          # ESLint flat config compartido
├── .prettierrc               # Formato compartido
└── pnpm-workspace.yaml       # apps/*, packages/*, plugins/*
```

---

## 5. Arquitectura de dependencias

La dirección de dependencias es estricta y unidireccional:

```text
apps/cli            (capa superior: interfaz de usuario)
   ↓
plugins             (integraciones opcionales, desacopladas)
   ↓
services / features (project-detector, git, doctor…)
   ↓
packages            (filesystem, shell, config, logger)
   ↓
core                (fundamentos, sin dependencias internas)
```

Reglas:

1. **Responsabilidad única.** Cada paquete resuelve un problema concreto. No existe un `packages/utils` genérico.
2. **El CLI no contiene lógica de negocio.** Los comandos coordinan; los paquetes implementan.
3. **Los paquetes base nunca dependen del CLI** ni de capas superiores.
4. **Las dependencias internas siempre usan `workspace:*`.**
5. **Reutilización:** si dos comandos necesitan lo mismo, es un paquete o servicio.

---

## 6. TypeScript

La configuración base (`tsconfig.json` raíz) es estricta:

```jsonc
{
  "target": "ES2022",
  "module": "NodeNext",
  "moduleResolution": "NodeNext",
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "isolatedModules": true,
}
```

Cada paquete extiende la raíz:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Reglas:

- Todos los paquetes son **ESM** (`"type": "module"`).
- Prohibido `any`: preferir `unknown` y tipos explícitos.
- No usar `@ts-ignore` ni desactivar `strict` sin una razón técnica documentada.

### Nota: por qué TypeScript 6.x y no 7

El proyecto usa **TypeScript 6.0.3** (última estable con API clásica). TypeScript 7.0 (compilador nativo) **no expone aún una API programática estable** — llega con 7.1 — y `typescript-eslint` la necesita para funcionar. Cuando salga 7.1 se reevaluará la migración.

---

## 7. Tests

Framework: **Vitest**. Cada paquete tiene sus tests en `tests/`:

```text
packages/logger/
├── src/index.ts
└── tests/logger.test.ts
```

Convenciones:

- Los tests importan desde `../src/...` directamente (no requieren build).
- Cubrir: casos normales, casos vacíos, archivos inexistentes, proyectos inválidos.
- Los fixtures de proyectos de ejemplo vivirán en `tests/fixtures/` (raíz) cuando llegue el project-detector.
- Comportamiento multiplataforma (Windows/Linux/macOS) se testea con `node:path` y APIs de Node, nunca con rutas hardcodeadas.

---

## 8. Calidad: lint y formato

- **ESLint 9** con flat config en la raíz (`eslint.config.js`), heredada automáticamente por todos los paquetes.
- Regla destacada: `@typescript-eslint/no-explicit-any: error`.
- **Prettier** para formato: `pnpm format` (o deja que tu IDE lo aplique al guardar).

Checklist antes de considerar algo terminado:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Los cuatro deben pasar.

---

## 9. Git y commits

### Ramas

Ramas cortas y descriptivas desde `main`:

```text
feat/project-detector
feat/doctor-command
fix/windows-paths
refactor/logger
docs/plugin-system
chore/update-dependencies
```

`main` representa siempre un estado estable. No hay rama `develop`.

### Conventional Commits

```text
feat:     nueva funcionalidad      feat(project): detect pnpm workspaces
fix:      corrección de bug        fix(cli): handle missing project
docs:     documentación            docs: document plugin architecture
test:     tests                    test(project): add detector fixtures
refactor: refactorización          refactor(core): simplify project context
perf:     rendimiento              perf(detector): cache project detection
ci:       integración continua     ci: add pull request checks
chore:    mantenimiento            chore: update dependencies
```

Cada commit representa un cambio real. No se generan commits artificiales.

### Flujo habitual

```bash
git switch main
git pull
git switch -c feat/mi-feature

# ... desarrollar ...

pnpm lint && pnpm typecheck && pnpm test && pnpm build

git status          # comprobar que no se cuelan artefactos
git add .
git commit -m "feat(scope): describe el cambio"
git push -u origin feat/mi-feature
```

### Pull Requests

Un PR debe:

- tener un título descriptivo (`feat(project): add Node.js detection`)
- explicar **qué** cambia y **por qué**
- incluir tests cuando corresponda
- pasar CI
- no contener cambios no relacionados

---

## 10. Versionado y releases

- **Semantic Versioning**: `MAJOR.MINOR.PATCH` (0.1.0, 0.2.1, 1.0.0…).
- **Changesets** para registrar cambios que afectan a usuarios:

```bash
pnpm changeset        # crea un changeset describiendo el cambio
```

Los changesets se acumulan en `.changeset/` y se consumen en el release. No editar changelogs manualmente.

---

## 11. Roadmap

El plan por fases, con criterios de aceptación y estado actual, vive en [ROADMAP.md](./ROADMAP.md).

---

## 12. Solución de problemas

**`pnpm build` falla con `invalid_package_manager_field`**
El campo `packageManager` debe tener semver completo (`pnpm@12.5.1`, no `pnpm@12`). Comprueba que usas la versión fijada: `corepack prepare pnpm@12.5.1 --activate`.

**Un paquete no encuentra una dependencia de otro paquete**
Con pnpm estricto no hay hoisting. Declara la dependencia en el `package.json` del paquete con `workspace:*`.

**ESLint falla con `Cannot find package` en `eslint.config.js`**
La config vive en la raíz, por lo que `@eslint/js` y `typescript-eslint` deben estar en las devDeps de la **raíz**. Los paquetes solo necesitan `eslint` (el binario).

**Turbo avisa `no output files found for task ...#test`**
Esperado: la tarea `test` declara `coverage/**` como output, que solo existe al activar coverage. No es un error.

**Después de `pnpm clean`, `pnpm build` es instantáneo**
Turborepo restaura los outputs desde su cache local. El build es correcto.

**El CI falla en "Format check" pero local pasa (CRLF en Windows)**
El repo fuerza LF vía `.gitattributes` (`* text=auto eol=lf`); Prettier exige LF. Si ves diferencias entre tu máquina y CI, comprueba `git ls-files --eol` y asegúrate de commitear con el fichero guardado en disco (los buffers abiertos del IDE pueden sobrescribir cambios). La batería de verificación **siempre incluye** `prettier --check .` — es la misma que ejecuta el CI.

**Errores TS2591: `Cannot find name 'node:fs'` / `Cannot find namespace 'NodeJS'`**
El paquete importa builtins de Node pero no ve sus tipos. `@types/node` debe estar en la **raíz** (versión alineada con el LTS: `@types/node@22`) y el tsconfig raíz declara `"types": ["node"]` — la resolución automática de `@types` no sube directorios en workspaces de pnpm, la explícita sí.

---

## 13. Reglas para agentes de IA

Leer primero `AGENTS.md` (y el `AGENTS.md` del subdirectorio correspondiente cuando exista) antes de modificar código.

Los agentes no deben:

- cambiar la arquitectura sin motivo justificado
- introducir dependencias innecesarias
- desactivar `strict` o ignorar errores de TypeScript
- borrar tests para hacer pasar la suite
- modificar APIs públicas sin documentarlo
- realizar cambios no relacionados con la tarea
- generar commits artificiales

---

## 14. Principio fundamental

Devix crece mediante **funcionalidad real**, no mediante commits artificiales.

```text
Correctness > Maintainability > Developer Experience > Performance > Feature count
```

Un buen commit:

```text
feat(project): detect pnpm workspaces
```

La cantidad de commits no es el objetivo. El objetivo es una herramienta útil, mantenible y técnicamente sólida.
