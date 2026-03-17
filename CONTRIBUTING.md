# Contributing to Tapiz

## Before You Start

**Please open a [GitHub issue](https://github.com/juanfran/tapiz/issues) before writing any code**, regardless of the change type (bug fix, feature, refactor, docs, etc.). This avoids duplicate effort and lets us align on the approach before you invest time in implementation.

## Development Setup

**Prerequisites**

- Node.js 24.13+
- pnpm 10.12+
- PostgreSQL

**Getting started**

```bash
pnpm install        # Install dependencies
pnpm config         # Set up environment variables
pnpm start          # Start the web app (port 4300)
pnpm start:api      # Start the API server
```

See [docs/INSTALL.md](docs/INSTALL.md) for detailed installation instructions.

## Code Style

- **Format**: `pnpm format` (Prettier)
- **Lint**: `pnpm lint` (ESLint)

Pre-commit hooks (Husky) enforce these automatically on every commit.

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/). CommitLint enforces this on every commit.

Common prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Running Tests

```bash
pnpm test           # Unit & integration tests (Vitest)
pnpm e2e:tests      # End-to-end tests (Cypress)
```

Make sure all tests pass before submitting a PR.

## Submitting a Pull Request

1. Open an issue and get feedback before starting work.
2. Fork the repo and create a branch from `main`.
3. Make your changes — keep each PR focused on a single concern.
4. Ensure `pnpm lint` and `pnpm test` pass.
5. Reference the related issue in the PR description (e.g. `Closes #123`).
