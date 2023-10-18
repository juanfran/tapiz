/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StateActions } from './models/node.model';
import { Point } from './models/point.model';
import { BoardCommonActions } from './board-common-actions';

/* group patchs over the same object, example moving mouse */
export function optimize(actions: StateActions[] | unknown[]) {
  const isStateAction = (action: any): action is StateActions => {
    return 'op' in action && 'data' in action;
  };

  const isMouseMoveAction = (
    action: any
  ): action is { type: string; position: Point; cursor: Point } => {
    return action.type === BoardCommonActions.moveUser;
  };

  const optimizedTmp: Record<string, any> = {};
  const notOptimized: unknown[] = [];

  let key = '';

  actions.forEach((action) => {
    if (isMouseMoveAction(action)) {
      key = 'mouse-move';
    } else if (!isStateAction(action)) {
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

  return [...notOptimized, ...Object.values(optimizedTmp)];
}
/* eslint-enable @typescript-eslint/no-explicit-any */
