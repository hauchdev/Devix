## What changes

A clear and concise description of the change.

## Why

Motivation and context. If it closes an issue, link it with `Closes #N`.

## How it was tested

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `npx prettier --check .`
- [ ] Includes tests for new behavior

## Checklist

- [ ] Conventional Commits title (`feat(scope): …`)
- [ ] Single topic: no unrelated changes
- [ ] Respects the dependency architecture (`apps/cli → plugins → services → packages → core`)
- [ ] Cross-platform (Windows included): `node:path`, no hardcoded paths
- [ ] Typed package errors, no raw error leaking
- [ ] Changeset included if the change affects users (`pnpm changeset`)
