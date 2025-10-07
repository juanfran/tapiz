# Repository Guidelines

## Project Structure & Module Organization

Tapiz uses Nx to orchestrate applications and shared libraries. The Angular front end lives in `apps/web/src`, with environment files under `apps/web/src/environments`. Fastify/TRPC backend services are in `apps/api/src`, while database schema and migrations reside in `drizzle/` with helper scripts in `apps/api/src/app/db`. Shared UI, board logic, and utilities are split across `libs/ui`, `libs/board-commons`, `libs/sync-node-box`, and `libs/utils`, and Nx tags enforce module boundaries. Documentation and deployment assets sit in `docs/` and `resources/`, and production artifacts are emitted to `dist/`.

## Build, Test, and Development Commands

- `pnpm start` runs `scripts/setup-env.js` then serves the Angular client at http://localhost:4300 using the proxy in `apps/web/proxy.conf.json`.
- `pnpm start:api` launches the Fastify backend; run it alongside the web app for end-to-end development.
- `pnpm build` creates the production bundle in `dist/apps/web`; pair it with `pnpm migrate` to apply Drizzle migrations before deploying.
- `pnpm test` executes Vitest unit suites across the web app and shared libs; `pnpm e2e:tests` runs the API integration suite.
- `pnpm lint` and `pnpm format` enforce code quality and Prettier formatting—run them before committing.

## Coding Style & Naming Conventions

TypeScript and SCSS follow the flat-config rules in `eslint.config.js`. Use single quotes, avoid extra semicolons, and keep at most one consecutive blank line. Angular components and services use PascalCase class names with kebab-case file names (`board-toolbar.component.ts`), while Nx libraries adopt kebab-case directories and exported TypeScript namespaces. Respect tags such as `scope:web`, `scope:server`, and `type:ui` when adding dependencies or new libraries. Prefer two-space indentation in SCSS and rely on `pnpm format` for final formatting passes.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Testing Guidelines

Unit tests live next to source files as `*.spec.ts`, using Vitest globals configured in `apps/web/src/test-setup.ts` and `apps/api/src/test-setup.ts`. Mock collaborators with `vi.fn()` or fixtures in module-level `__tests__` folders to keep isolation high. Run `pnpm test` before every PR, and extend coverage in both the client and API whenever you touch shared contracts. Add backend migration tests in `apps/api` when altering Drizzle schemas, and prefer interaction-focused specs for complex board behaviors.

## Commit & Pull Request Guidelines

Commit messages must follow Conventional Commits (`feat(board): add timeline zoom`), enforced by Husky and commitlint. Keep commits focused, include configuration updates (env files, migrations) in separate commits when possible, and ensure the diff passes linting, tests, and the relevant build. PRs need a concise summary, linked issues, and UI screenshots or GIFs for visual changes. Call out breaking migrations or config shifts, and provide manual verification steps so reviewers can reproduce your results quickly.
