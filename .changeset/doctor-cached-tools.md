---
"@devix-cli/doctor": minor
---

Cache tool version probes with a 5-minute TTL so repeated `devix doctor` and `devix status` runs do not re-spawn every tool. Only successful probes are cached, so installing a tool takes effect on the next run. Exposed as `withCachedTools` for custom service composition; cache failures never block a probe.
