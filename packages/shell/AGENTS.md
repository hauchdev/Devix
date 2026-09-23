# @devix/shell

Ejecución controlada de procesos externos para Devix (git, pnpm, docker…).

## Reglas de seguridad (innegociables)

1. **Nunca usar `shell: true` con input que no controle el paquete.** Los comandos se pasan como argv array; Node hace el quoting nativo.
2. **Shims `.cmd`/`.bat` (Windows):** solo pueden lanzarse vía `cmd.exe /d /s /c` rechazando antes todo argumento que contenga metacaracteres de cmd (`& | < > ( ) ^ % ! "`). El error es tipado (`EUNSAFE_ARG`), nunca se "escapa a mano".
3. **Prohibido `eval`, templates de shell, concatenar strings de comando.**
4. **Resolución en PATH nunca desde el CWD** (evita secuestrar el binario por un ejecutable del directorio actual).
5. Timeout y abort siempre disponibles; por defecto sin límite de tiempo pero **con** límite de salida (10 MiB por stream).

## Reglas de diseño

- Non-zero exit code **no es una excepción**: `runCommand` devuelve `CommandResult`. Las excepciones tipadas (`ShellError`) son para fallos excepcionales (no encontrado, timeout, abortado, límite de salida).
- Multiplataforma: los tests usan `process.execPath` (node), nunca binarios que puedan no existir. No asumir sintaxis de flags distintas entre plataformas en el código del paquete.
- No parsear la salida de comandos aquí; eso lo hacen los paquetes de dominio (git, deps…).
- Antes de modificar código, leer el `AGENTS.md` raíz y este archivo.
