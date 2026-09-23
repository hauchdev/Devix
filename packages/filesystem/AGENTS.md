# @devix/filesystem

Abstracciones multiplataforma de sistema de archivos para Devix.

## Reglas

1. **Nunca importes de capas superiores** (CLI, servicios, plugins). Este paquete solo puede depender de Node.js y de `@devix/core` si fuera necesario.
2. **Multiplataforma obligatoria:** usa siempre `node:path` (`join`, `sep`, `resolve`). Prohibido concatenar rutas con `/` o `\` a mano. El paquete debe funcionar igual en Windows, Linux y macOS.
3. **Errores tipados:** las funciones lanzan errores tipados del paquete (`FilesystemError` y subclases). No propagues errores crudos de `node:fs`.
4. **No asumas codificaciones:** las APIs de lectura devuelven `string` solo cuando tiene sentido; si el contenido puede ser binario, ofrece `Buffer`.
5. **Sin estado global ni singletons:** las funciones son puras respecto al FS (reciben rutas, devuelven resultados).
6. **Tests:** toda función pública necesita tests, incluyendo el caso "no existe". Usa `node:fs/promises mkdtemp` en `os.tmpdir()`; no commitees fixtures de FS.
7. **Rendimiento:** evita leer el mismo archivo dos veces. Si una operación necesita stat + read, usa las variantes que ya devuelven contenido.
8. Antes de modificar código, lee el `AGENTS.md` raíz y este archivo.
