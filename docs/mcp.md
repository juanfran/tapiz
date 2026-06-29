# Tapiz MCP Server

Tapiz exposes an MCP server from the API app so an MCP client can inspect and edit boards in the same realtime path as a connected user.

The endpoint is:

```text
POST /api/mcp
```

There is also a basic health endpoint:

```text
GET /api/mcp/health
```

## Architecture

The MCP server lives in `apps/api/src/app/mcp.ts` and is registered from `apps/api/src/app/init-server.ts`.

It uses the official TypeScript MCP SDK with the Streamable HTTP transport. Each MCP request creates a stateless MCP transport, authenticates the caller with a Tapiz API token, and registers tools for that authenticated user.

Board write tools do not mutate board state directly. They create a server-side virtual `Client`, join the requested board, and call `Client.processMsg()` with normal Tapiz `StateActions`. That keeps MCP edits on the same path as websocket users:

1. Board access is checked with the authenticated user.
2. The board is loaded into the shared `Server` state if needed.
3. Existing node validators accept or reject the action.
4. Valid actions update the in-memory board state.
5. Changes are broadcast to connected websocket clients.
6. The board is persisted by the existing server persistence flow.

Read-only board tools avoid joining as a client when possible. `get_board` checks board access and reads the loaded board state, falling back to the persisted board JSON.

## Authentication

MCP uses the same personal API token generated in the web settings page.

In Tapiz:

1. Open `Settings`.
2. Generate an API token.
3. Copy the token immediately. It is hidden after reload.

MCP clients must send it as a bearer token:

```text
Authorization: Bearer tapiz_pat_...
```

The API stores only the token hash. The MCP endpoint hashes incoming tokens and resolves the Tapiz user from `accounts.api_token_hash`.

## Tools

### Board Tools

`get_board`

Reads current board nodes for a board the token can access.

`add_node`

Adds one node. The node must match the Tapiz schema for its type.

`patch_node`

Patches one existing node. Only include changed content fields.

`remove_node`

Removes one existing node.

`apply_board_actions`

Applies multiple Tapiz `StateActions` in order. Use this for larger operations such as grouping notes, moving many nodes, or creating a full retrospective layout.

`get_user_settings`

Reads the authenticated user settings, including default note styling.

### Cocomaterial Tools

`list_cocomaterial_tags`

Lists available Cocomaterial tag slugs.

`search_cocomaterial_vectors`

Searches Cocomaterial assets by tag. Results include compact metadata and usable asset URLs.

`add_cocomaterial_asset`

Adds a selected Cocomaterial asset to a board. SVG URLs become `vector` nodes. GIF and other URLs become `image` nodes. The tool uses centered placement and converts it to Tapiz's top-left node position.

## Local Setup

Install dependencies:

```shell
pnpm install
```

Start the API:

```shell
pnpm start:api
```

Start the web app if you need to generate a token from the settings UI:

```shell
pnpm start
```

By default, the web app runs at:

```text
http://localhost:4300
```

The API MCP endpoint uses the configured API port:

```text
http://localhost:<API_PORT>/api/mcp
```

## Connecting an MCP Client

Use Streamable HTTP transport and pass the Tapiz API token as a bearer token.

For Claude Code, a local example is:

```shell
claude mcp add --transport http tapiz http://localhost:<API_PORT>/api/mcp \
  --header "Authorization: Bearer tapiz_pat_..."
```

For hosted MCP clients, expose the API over HTTPS and configure the same endpoint and bearer token.

## Example Workflows

Create a fun retrospective:

1. Call `get_user_settings` for note defaults.
2. Call `list_cocomaterial_tags`.
3. Call `search_cocomaterial_vectors` for relevant assets.
4. Call `apply_board_actions` to create notes, groups, labels, and layout.
5. Call `add_cocomaterial_asset` for decorations.

Group all notes in a board:

1. Call `get_board`.
2. Infer categories from existing note text.
3. Call `apply_board_actions` with group additions and note patches that move notes into the relevant group positions.

## Validation

Run focused API checks after changing MCP code:

```shell
pnpm exec nx typecheck api
pnpm exec nx test api -- --run src/app/mcp.spec.ts
pnpm exec nx lint api
```
