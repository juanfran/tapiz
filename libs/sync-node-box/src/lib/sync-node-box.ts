import type { StateActions, TuNode } from '@tapiz/board-commons';

import { BehaviorSubject, distinctUntilChanged, shareReplay } from 'rxjs';
import { applyAction } from './apply-action.js';
import { SyncNodeBoxHistory, SyncNodeBoxOptions } from './models.js';
import { undo } from './undo.js';
import { redo } from './redo.js';
import { reverseAction } from './rever-action.js';

export function syncNodeBox(options?: SyncNodeBoxOptions) {
  const nodes = new BehaviorSubject<TuNode[]>([]);
  let nodesHistory: SyncNodeBoxHistory = {
    past: [],
    future: [],
  };

  const boxOptions: {
    history: number;
    log: boolean;
  } = {
    log: false,
    history: 30,
    ...options,
  };

  function getState() {
    return nodes.value;
  }

  function setState(newState: TuNode[]) {
    nodes.next([...newState]);
  }

  function log(content: object | string, tag: string) {
    console.log(`[syncNodeBox][${tag}]`, JSON.parse(JSON.stringify(content)));
  }

  function sync() {
    return nodes.asObservable().pipe(shareReplay(1), distinctUntilChanged());
  }

  if (options?.log) {
    sync().subscribe((state) => log(state, 'state'));
  }

  const addToHistory = (actions: StateActions[]) => {
    const currentState = getState();

    const newActions = actions
      .map((it) => {
        return reverseAction(currentState, it);
      })
      .filter((it): it is StateActions => !!it);

    if (newActions.length) {
      nodesHistory.past.unshift(newActions);
    }

    if (nodesHistory.past.length > boxOptions.history) {
      nodesHistory.past.pop();
    }

    nodesHistory.future = [];

    return getState();
  };

  return {
    actions: (actions: StateActions[], history = false) => {
      if (options?.log) {
        log(actions, 'actions');
      }

      if (history) {
        addToHistory(actions);
      }

      const currentState = getState();

      setState(
        actions.reduce((state, action) => {
          if (action.parent) {
            return state.map((it: TuNode<object, string>) => {
              if (it.id === action.parent) {
                return {
                  ...it,
                  children: applyAction(it.children ?? [], action),
                };
              }

              return it;
            });
          }

          return applyAction(state, action);
        }, currentState),
      );

      return getState();
    },
    patchHistory: (fn: (history: SyncNodeBoxHistory) => SyncNodeBoxHistory) => {
      nodesHistory = fn(nodesHistory);
    },
    undo: (autoApply = true) => {
      if (options?.log) {
        log(nodesHistory, 'undo');
      }

      const currentState = getState();

      const [newState, newHistory, actionsApplied] = undo(
        currentState,
        nodesHistory,
      );

      if (autoApply && actionsApplied.length) {
        setState(newState);

        nodesHistory = newHistory;

        return actionsApplied;
      }

      return actionsApplied;
    },
    redo: (authApply = true) => {
      if (options?.log) {
        log(nodesHistory, 'redo');
      }

      const currentState = getState();

      const [newState, newHistory, actionsApplied] = redo(
        currentState,
        nodesHistory,
      );

      if (authApply && actionsApplied.length) {
        setState(newState);

        nodesHistory = newHistory;

        return actionsApplied;
      }

      return actionsApplied;
    },
    sync: () => {
      return sync();
    },
    get: () => {
      return getState();
    },
    update: (fn: (state: TuNode[]) => TuNode[]) => {
      const currentState = getState();

      setState(fn(currentState));

      return getState();
    },
  };
}
