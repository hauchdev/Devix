---
"@devix-cli/core": patch
"@devix-cli/docker": patch
"devix-cli": patch
---

Advertised versions no longer drift from releases: `DEVIX_VERSION` and the docker plugin version are now read from each package's own manifest instead of hardcoded literals. Docker plugin tests get generous timeouts and concurrent probes so slow Windows CI runners no longer time out.
