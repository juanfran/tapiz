# Architecture

Tapiz uses Nx to coordinate the web app, API, and shared libraries. Treat package boundaries as part of the design: shared contracts belong in libraries, not copied into apps.

## Project Shape

- `apps/web` contains the Angular client and board experience.
- `apps/api` contains the Fastify/TRPC backend and server-side validation.
- `apps/preview-worker` is an optional standalone Node process that renders board thumbnails with headless Chromium (Puppeteer). It polls the API and is not required for the app to run.
- `libs/board-commons` contains shared board models and validators used by both client and API.
- `libs/ui`, `libs/cdk`, `libs/sync-node-box`, and `libs/utils` provide reusable UI, interaction, sync, and utility behavior.
- `drizzle` contains database schema and migrations.

## Contracts

- Shared node content that must persist or sync should have a model and validator in `libs/board-commons`.
- The API should validate add/patch actions with the shared validators instead of accepting client-only shapes.
- Web code should import shared board types rather than redefining equivalent local types.
- When changing a shared contract, update both client usage and API validation tests.

## Dependency Boundaries

Nx tags enforce module boundaries. Prefer existing library APIs and local helper functions over adding cross-scope imports that bypass those boundaries.

Use app-level code for app behavior, shared libraries for cross-app contracts and reusable utilities, and focused pure helpers for board geometry or state transformations that need regression tests.
