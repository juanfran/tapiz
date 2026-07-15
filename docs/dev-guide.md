# How to Install Tapiz Locally for Development

## Requirements

- **Node and PNPM**: Ensure you have the versions specified in the `engines` section of the [package.json](../package.json) file.
- **PostgreSQL**: Use the same version as specified in the [docker-compose.yaml](../docker-compose.yaml) file.

## Configuration

1. Create a `.env` file in the root directory of the project.
2. Follow the detailed instructions provided in [INSTALL.md](INSTALL.md) to fill in the required environment variables.

## Installation

To install the necessary dependencies, run:

```shell
pnpm install
```

## Running the Application

To start the application, use the following commands:

```shell
pnpm start
pnpm start:api
```

Tapiz should now be accessible at `http://localhost:4300/`.

## MCP Server

The API exposes a Streamable HTTP MCP server for realtime board automation. See [Tapiz MCP Server](mcp.md) for architecture, token setup, tool behavior, and local connection examples.

## AI screenshot sessions

Local browser agents can create a normal session as an existing Tapiz user
without completing Google login. Add the following to `.env` and restart the API:

```dotenv
AI_AGENT_LOGIN_ENABLED=true
```

The endpoint is registered only when `NODE_ENV=development`, even if the flag
is enabled. The Docker Compose API uses production mode, so use
`pnpm start:api` for this workflow.

Generate a personal API token from the Tapiz settings page and save it when it
is shown. The agent sends that token to request a browser session for one
board. The token owner must already have access to the board; this feature does
not bypass board or team authorization. It creates the same Lucia session used
by regular login, so the browser has the token owner's normal permissions.
Close the browser context after taking the screenshot.

With Playwright, the browser context's request client shares cookies with its
pages:

```ts
const response = await context.request.post('http://localhost:8000/api/agent/session', {
  headers: {
    Authorization: `Bearer ${process.env.TAPIZ_API_TOKEN}`,
  },
  data: {
    boardId,
  },
});

if (!response.ok()) throw new Error(await response.text());

const { loginUrl, boardUrl } = await response.json();
await page.goto(loginUrl);
await page.waitForURL('http://localhost:4300/');
await page.goto(boardUrl);
await page.screenshot({ path: 'board.png', fullPage: true });
```

Send the API token only in the `Authorization` header. Do not put it in a URL,
browser storage, or a cookie. The endpoint exchanges it server-side for the
normal Lucia session cookie.
