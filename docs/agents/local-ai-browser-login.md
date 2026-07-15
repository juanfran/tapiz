# Local AI Browser Login

Tapiz provides a development-only login endpoint for AI agents that need to
open a board and take screenshots.

## Security Boundaries

- Keep the route restricted to `NODE_ENV=development`. It must remain
  unavailable in production even if its feature flag is accidentally enabled.
- Require `AI_AGENT_LOGIN_ENABLED=true` and authenticate the request with an
  existing personal API token in the `Authorization: Bearer tapiz_pat_...`
  header.
- Use the token owner as the browser identity. Do not accept a user ID or email
  that would let the caller select a different user.
- Verify that the token owner already has access to the requested board. Never
  grant or broaden board, team, or SaaS permissions through this route.
- Issue the same normal Lucia session cookie used by regular login so all
  existing authorization checks continue to apply.
- Never place the API token in a URL, browser storage, or a cookie. Exchange it
  server-side for the Lucia session cookie.

Use `POST /api/agent/session` to create the session. See the
[development guide](../dev-guide.md#ai-screenshot-sessions) for configuration,
the request format, and a Playwright example.
