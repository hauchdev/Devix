---
"@devix/project-detector": patch
---

Añade el paquete `@devix/project-detector` (FASE 2): arquitectura extensible de detectores (`DetectorRegistry` + interfaz `Detector`, sin if/else central), resolución de raíz de proyecto con `findProjectRoot` (markers declarados, el más cercano gana) y API `detectProject(registry, { cwd })` que agrega resultados por detector. Incluye el primer detector (`node`: package.json con name, packageManager, engines y workspaces) y fixtures commitadas para tests.
