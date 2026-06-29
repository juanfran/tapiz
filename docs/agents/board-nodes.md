# Board Nodes

Board nodes are user-facing, persisted, and often synchronized. Treat their content shape and interaction behavior as a shared contract.

## Adding Or Changing Node Content

When a node content field is created or changed:

- Update the shared model/validator in `libs/board-commons`.
- Register or adjust API validation in `apps/api` so add/patch actions persist.
- Update the Angular component that renders or edits the node.
- Add focused tests for shared validation and behavior.

For a basic node creation checklist, see [docs/create-node.md](../create-node.md).

## Board Interaction

- Board coordinates, zoom, pan, rotation, and snap behavior should be handled deliberately; avoid mixing screen coordinates with board coordinates.
- If an endpoint or handle stores an offset relative to a node, keep that offset in node-local coordinates and transform it when rendering or snapping.
- For arrows and similar visual connectors, keep the visible SVG path, hit path, markers, and persisted endpoints in sync.
- Prefer small pure helpers for geometry and path construction, then render those results in Angular.
- When creating boards through MCP, follow the node type tradeoffs and browser
  verification workflow in [Tapiz MCP Server](../mcp.md). In particular, raw
  rich-text heading tags can render far larger than compact text/panel nodes.
- `content.layer` is not visual z-index. Use supported layer roles only
  (`0` participant content, `1` edit/template content). Visual stacking comes
  from node order in the board array: later sibling nodes render above earlier
  sibling nodes.

For the arrow-specific details learned from the current implementation, see [Board Geometry And Arrows](board-geometry-and-arrows.md).

## Persistence

- If a node works visually but does not survive reload, check the shared validator and API validation path before debugging storage.
- Optional fields should have safe UI fallbacks so older boards keep rendering.
- Discrete UI options should be enforced by validation when saved.
