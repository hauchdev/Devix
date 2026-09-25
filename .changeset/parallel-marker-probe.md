---
"@devix/project-detector": patch
---

`findProjectRoot` now probes the markers of each directory in parallel instead of one by one. This makes detection of non-project directories (the no-marker worst case) several times faster, which matters most on Windows with real-time antivirus scanning.
