# Board Geometry And Arrows

This doc captures the board geometry details that are easy to rediscover the hard way. Use it when changing arrows, snapping, overlays, node rotation, or SVG hit testing.

## Coordinate Systems

- Board node `position` is in board coordinates.
- Board nodes rotate around their top-left corner. The rendered transform is equivalent to `translate(position) + rotate(rotation)`.
- Pointer events arrive in screen coordinates; convert them to board coordinates using the current board pan and zoom before doing snap or geometry work.
- If a value is stored as an offset inside a node, keep it in node-local coordinates. Convert world-to-local with inverse rotation for snap, and local-to-world with node rotation for rendering.

## Arrow Content

- Arrow nodes have their own bounding box. Their `start` and `end` points are local to that arrow node box.
- `startAttachment` and `endAttachment` point at another node and store a node-local `offset`.
- When an arrow is attached, render from the current attached node geometry instead of trusting the old absolute endpoint.
- Keep optional arrow fields backward compatible. Old boards may not have newer fields, so UI/rendering should provide safe fallbacks.
- Persisted arrow options should be validated in `libs/board-commons` and accepted by API validation before assuming they will survive reload.

## Snapping And Rotation

- Snap checks should happen in the target node's local coordinate space.
- For rotated nodes, transform the pointer into local coordinates, test against an expanded local rect, project to the closest local rect border, then transform the anchor back to world coordinates.
- Curved arrows should use the attached side normal as the endpoint tangent. Compute the side in local coordinates, then rotate that normal into world coordinates.
- If a tangent is for the arrow end, invert the outward normal so the curve enters the node instead of leaving away from it.

## SVG Paths And Hit Testing

- The visible path and the clickable hit path must represent the same curve.
- For arrowheads, trim the visible line so it does not draw underneath the marker, but do not recalculate a separate curved path from new endpoints. Trim the same Bezier used by the hit path.
- Keep the hit path wider than the visible stroke so thin arrows remain easy to click.
- Pointer events should be explicit: usually wrapper/host elements are `pointer-events: none`, while the actual path stroke and endpoint handles are clickable.

## Editing UX

- Reuse the existing arrow toolbar for arrow edits. Do not add one-off inline controls inside the board.
- Arrow nodes should not show generic resize boxes unless resizing becomes an intentional feature.
- Only the arrow stroke and endpoint handles should be clickable; the invisible arrow node box should not block scroll or board interactions.
- Deselecting a selected arrow should close the arrow sidebar/popup, matching other board nodes.

## Test Seams

Prefer pure helper tests over component-only tests for geometry:

- Snap and attachment resolution belong near arrow geometry utilities.
- Curved path trimming and hit/visible path alignment belong near path utilities.
- Shared persisted fields should have API validation coverage.

Useful focused commands:

- `pnpm exec nx test web -- --run src/app/modules/board/components/arrows/arrow-utils.spec.ts`
- `pnpm exec nx test web -- --run src/app/modules/board/components/arrows/arrow-path.spec.ts`
- `pnpm exec nx test api -- --run src/app/validation.spec.ts`
