Create component in `libs/nodes/src/lib/`.

Add the action to `board-toolbar.component.html`.

Add the new node to `apps/web/src/app/app-node.ts`.

```ts
import { ESTIMATION_CONFIG } from '@tapiz/nodes/estimation';

registerNode('estimation', ESTIMATION_CONFIG);
```

Add the validator in `libs/board-commons/src/lib/validators`.

Register the API validator to `newValidators` in the `apps/api/src/app/validation.ts` file.

```ts
const validations = {
  // ...
  newValidators: [
    // ...
    {
      type: 'estimation',
      validator: ESTIMATION_VALIDATOR,
    },
  ],
};
```
