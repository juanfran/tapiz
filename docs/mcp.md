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

For local browser screenshots, the same token can be exchanged for a normal
browser session through the development-only agent login endpoint. See
[AI screenshot sessions](dev-guide.md#ai-screenshot-sessions). The token owner
must already have access to the requested board.

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
6. Open the board in a browser and verify the actual rendered result. Rich text
   can render much larger than its node box if you use raw heading tags.

Group all notes in a board:

1. Call `get_board`.
2. Infer categories from existing note text.
3. Call `apply_board_actions` with group additions and note patches that move notes into the relevant group positions.

## MCP Board-Building Guidance

Use the same mental model as the web app: nodes are persisted user-facing
objects on an infinite canvas, and MCP writes go through normal realtime
validation.

- Always call `get_board` before editing an existing board. Preserve existing
  user, settings, timer, poll, estimation, and content nodes unless the user
  asked to replace them.
- Use `apply_board_actions` for multi-node changes. A full layout should arrive
  as one batch so ordering, layers, parent/child relationships, and validation
  are handled together.
- Use board coordinates for `content.position`; do not use browser screen
  coordinates. Keep related nodes near the current viewport unless the user asks
  for a large template.
- Do not use `content.layer` as z-index. Tapiz uses layer `0` for participant
  board content such as notes/text and layer `1` for edit/template content such
  as panels. Do not invent arbitrary layers such as `2`: validation accepts only
  layers `0` and `1`, and board-mode interactions such as area selection are
  designed around those roles.
- Visual depth/z-index comes from node order in the board array. Later sibling
  nodes render above earlier sibling nodes. To put an element in front of or
  behind another element, move it in the array with `apply_board_actions`
  `position`/ordering rather than changing `content.layer`. For example, put
  lane panels earlier than the notes that should appear on top of them.
- Prefer explicit `width` and `height`. Resize text boxes and notes based on the
  rendered content you expect, not just the number of characters.
- For retrospective/post-it layouts, design around Tapiz's real default note
  size: `300x300`. Make lanes wide and tall enough for multiple `300x300` notes,
  leave room for at least a few additional notes per lane, reserve a header band
  inside each panel, and keep notes below panel labels/instructions.
- Do not set `panel.content.color` on lanes that contain notes unless you
  intentionally want every note inside that panel to use the panel color. Tapiz
  notes inside a panel use the panel `color` instead of their own note `color`.
- Note text renders black and notes may expose footer/author UI, so use light
  high-contrast note colors and make notes tall enough that the content does not
  collide with footer text.
- Verify in the web app with Playwright after MCP writes. Check at least the
  visible text, bounding boxes, and a screenshot. If the browser redirects to
  login locally, create a real local session for verification instead of relying
  only on `get_board`.
- Rich text supports HTML, but raw `h1`, `h2`, and `h3` tags are styled for
  canvas templates and can become huge. For compact MCP-created labels, use
  paragraph/span markup with explicit `font-size` and `line-height`, then verify
  that the text fits in its node.

## Node Type Tradeoffs

Use the narrowest node type that matches the user workflow:

| Node type             | Best use                                                                     | Advantages                                                                                                                                                         | Disadvantages and cautions                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `note`                | Retrospective ideas, brainstorm items, voting targets, discussion cards.     | Designed for editable sticky-note content; supports votes, emojis, comments, drawing, note visibility, author display, and user defaults from `get_user_settings`. | Requires full content on add: `text`, `votes`, `emojis`, `drawing`, `ownerId`, `width`, `height`, `color`, `position`, and layer `0` for participant notes. User-created notes default to about `300x300`; use that when reserving lane space. Text renders black, so use light high-contrast colors. Make notes tall enough for content plus footer/author UI. Avoid using notes as large static headers. |
| `panel`               | Background areas, columns, frames, template sections, visual grouping zones. | Resizable, rotatable, can have background, border, radius, text, and drawing. Good for labeled lanes behind notes.                                                 | Use layer `1` for template/edit panels. Panel rich text uses canvas-scale heading styles. Use explicit inline font sizes for compact labels. Reserve a header band and leave empty lane space for future notes. Avoid `content.color` for lanes with notes because it overrides note colors inside the panel.                                                                                              |
| `group`               | Movable clusters of related nodes or voted note groups.                      | Supports a title and votes, and works with board grouping interactions.                                                                                            | It is a semantic cluster, not a decorative column. Use panels for static lanes; use groups when users should move or vote on the cluster.                                                                                                                                                                                                                                                                  |
| `text`                | Standalone titles, instructions, legends, and labels.                        | Lightweight rich-text node without a frame. Good for instructions above a layout.                                                                                  | Raw heading tags can render very large. Give text nodes explicit dimensions and use inline font sizes for predictable MCP output.                                                                                                                                                                                                                                                                          |
| `arrow`               | Connectors between flow steps, dependencies, or annotations.                 | Supports straight/curved/elbow lines, stroke styles, widths, arrowheads, and node attachments.                                                                     | Endpoints are local to the arrow box, while attachments store node-local offsets. Use the geometry guidance before creating attached arrows.                                                                                                                                                                                                                                                               |
| `vector`              | Cocomaterial SVG decorations or icons.                                       | Scales cleanly and stores only a URL plus dimensions. `add_cocomaterial_asset` handles centered placement.                                                         | External URL availability affects rendering. Avoid decorative vectors when they distract from editable board content.                                                                                                                                                                                                                                                                                      |
| `image`               | Uploaded or external bitmap references.                                      | Good for screenshots, diagrams, and non-SVG assets.                                                                                                                | External URLs can fail or load slowly. Prefer vectors for simple illustrations and avoid images for text-heavy content.                                                                                                                                                                                                                                                                                    |
| `token`               | Small personal markers, status chips, or labels created from the toolbar.    | Compact, colorable, and useful as movable markers.                                                                                                                 | Not a replacement for notes; no rich content, votes, or comments.                                                                                                                                                                                                                                                                                                                                          |
| `poll`                | Structured voting with fixed options.                                        | Enforces one vote per user and supports anonymous/public modes.                                                                                                    | Poll title/options/mode are intentionally hard to change after creation. Use only when the board needs a real poll, not casual note voting.                                                                                                                                                                                                                                                                |
| `estimation`          | Planning poker style estimation boards.                                      | Specialized workflow for stories, scales, and result collection.                                                                                                   | Requires related config/result nodes and app workflow knowledge. Do not create for ordinary retrospectives.                                                                                                                                                                                                                                                                                                |
| `timer`               | A single shared board timer.                                                 | Useful for facilitated activities such as silent writing.                                                                                                          | Only one timer node with id `timer` is allowed. Avoid adding one unless the user requested timed facilitation.                                                                                                                                                                                                                                                                                             |
| `comment`             | Threaded discussion attached to a note.                                      | Keeps discussion with the note.                                                                                                                                    | Must be a child of a `note`; do not add as a top-level node.                                                                                                                                                                                                                                                                                                                                               |
| `settings` and `user` | Board/user runtime state.                                                    | Needed by the app for visibility, cursor, and settings behavior.                                                                                                   | Do not create or remove these for layout work. Preserve them when editing boards.                                                                                                                                                                                                                                                                                                                          |

For node schema details, read the validators in
`libs/board-commons/src/lib/validators` and the API validation registry in
`apps/api/src/app/validation.ts`.

## Validation

Run focused API checks after changing MCP code:

```shell
pnpm exec nx typecheck api
pnpm exec nx test api -- --run src/app/mcp.spec.ts
pnpm exec nx lint api
```
