# Tapiz Agent Guide

Tapiz is an Nx monorepo for a collaborative whiteboard: an Angular web app, a Fastify/TRPC API, and shared libraries for board nodes, validation, UI, sync, and utilities.

Keep this root guide intentionally small. If new guidance only applies to one area, add it to a scoped file under [docs/agents](docs/agents/) instead of growing this file.

## Essentials

- Use `pnpm`; the repo enforces it with `only-allow`.
- Prefer focused Nx commands such as `pnpm exec nx test web -- --run` over broad repo commands while iterating.
- Run the checks that match the files you changed before handing work back.
- For Vitest filters through Nx, pass paths relative to the project root: `src/...`, not `apps/web/src/...`.

## Common Commands

- Web dev server: `pnpm start` (`http://localhost:4300`)
- API dev server: `pnpm start:api`
- Production web build: `pnpm build`
- DB migrations: `pnpm migrate`
- Full lint: `pnpm lint`
- Full format: `pnpm format`
- Full non-API unit tests: `pnpm test`
- API integration tests: `pnpm e2e:tests`

## Scoped Guidance

- [Architecture](docs/agents/architecture.md): app/library layout and shared contracts.
- [Angular And UI](docs/agents/angular-ui.md): Angular, signals, templates, and board UI conventions.
- [Board Nodes](docs/agents/board-nodes.md): adding or changing board node behavior, validation, persistence, and geometry.
- [Board Geometry And Arrows](docs/agents/board-geometry-and-arrows.md): coordinate transforms, snapping, arrow attachments, and SVG hit paths.
- [Local AI Browser Login](docs/agents/local-ai-browser-login.md): development-only API-token exchange for board screenshots and its security boundaries.
- [Testing](docs/agents/testing.md): project-specific test placement and focused validation commands.
- [Workflow](docs/agents/workflow.md): formatting, commits, PR expectations, and local development habits.

Existing setup docs are still useful for humans and agents:

- [Development guide](docs/dev-guide.md)
- [Install guide](docs/INSTALL.md)
- [Create a board node](docs/create-node.md)
