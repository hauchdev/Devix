---
"@devix/config": patch
---

Añade el paquete `@devix/config`: carga de configuración de Devix con búsqueda hacia arriba (`devix.config.json` / `devix.json`), JSON estricto sin ejecución de código, validación de forma con claves desconocidas rechazadas y errores tipados (`ConfigError`: `EPARSE`, `EINVALID_CONFIG`, `EUNSUPPORTED_FORMAT`, `EIO`). No encontrar configuración es un resultado normal (`undefined`).
