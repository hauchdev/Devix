---
"@devix/shell": patch
---

Speeds up `which` on Windows: PATH directories are now probed in parallel (keeping PATH order for results) and Windows candidate extensions are derived from `PATHEXT` instead of a fixed list, so a full miss no longer takes seconds.
