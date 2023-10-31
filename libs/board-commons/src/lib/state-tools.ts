/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StateActions } from './models/node.model';

/* group patchs over the same object, example moving mouse */
export function optimize(actions: StateActions[] | unknown[]) {
  const isStateAction = (action: any): action is StateActions => {
    return 'op' in action && 'data' in action;
  };

  const optimizedTmp: Record<string, any> = {};
  const notOptimized: unknown[] = [];

  let key = '';

  actions.forEach((action) => {
    if (!isStateAction(action)) {
      notOptimized.push(action);
      return;
    } else {
      key = `${action.op}-${action.data.type}-${action.data.id}`;
    }

    if (!optimizedTmp[key]) {
      optimizedTmp[key] = action;
    } else {
      optimizedTmp[key] = {
        ...optimizedTmp[key],
        ...action,
      };
    }
  });

  const result = [...notOptimized, ...Object.values(optimizedTmp)];

  result.forEach((action) => {
    delete action.history;
  });

  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
