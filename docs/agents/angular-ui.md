# Angular And UI

Use current Angular patterns and match the existing board UI. Avoid adding one-off controls inside board overlays when an existing toolbar/sidebar pattern already exists.

## Angular

- Components are standalone by default; do not set `standalone: true` in decorators.
- Set `changeDetection: ChangeDetectionStrategy.OnPush`.
- Prefer `input()` and `output()` over decorators.
- Prefer `inject()` over constructor injection.
- Use signals for local state and `computed()` for derived state.
- Do not use `mutate` on signals; use `set` or `update`.
- Put host bindings/listeners in the `host` object for new code.
- Use Reactive Forms for forms.

## Templates And Styles

- Use native control flow: `@if`, `@for`, and `@switch`.
- Do not use `ngClass`; use `class` bindings.
- Do not use `ngStyle`; use `style` bindings.
- Keep template logic simple and push non-trivial transformations into TypeScript.
- Use `NgOptimizedImage` for static images, except inline base64 images.

## Board UI

- Reuse existing board toolbar/sidebar components for editing controls.
- Do not make arrow or overlay nodes show generic resize boxes unless the behavior is intentionally supported.
- Keep pointer-event behavior explicit for overlays: the visible/clickable affordance should match what the user sees.
- Use pure geometry helpers for path, snap, hit-test, and transform math when possible; they are easier to test than component internals.
