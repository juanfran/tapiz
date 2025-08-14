# Workflow

Keep changes focused and easy to review. Prefer understanding the local pattern before introducing a new abstraction.

## Local Development

- Use `pnpm start` for the web app and `pnpm start:api` for the API.
- If `localhost:4300` is already in use, do not start a second web server on the same port.
- Use `pnpm exec prettier --write <files>` for touched files when formatting is needed.
- Prefer `rg` for code search.

## Git And Reviews

- Commit messages follow Conventional Commits, enforced by Husky/commitlint.
- Keep commits focused; separate migrations or configuration churn when practical.
- Do not revert unrelated dirty worktree changes.
- PRs should include a concise summary, linked issues, screenshots or GIFs for visual changes, and manual verification steps.
- Call out breaking migrations or config changes explicitly.

## Before Handing Back

- State which checks ran and whether any warnings remain.
- Mention checks that could not be run and why.
- For user-facing UI changes, include the local URL if a dev server is running or was started.
