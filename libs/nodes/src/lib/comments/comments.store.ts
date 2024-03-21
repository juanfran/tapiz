import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { CommentNode, TuNode } from '@team-up/board-commons';
import { NodesStore } from '../services/nodes.store';

type CommentsState = {
  parentNodeId: TuNode['id'] | undefined;
};

const initialState: CommentsState = {
  parentNodeId: undefined,
};

export const CommentsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ parentNodeId }, nodesStore = inject(NodesStore)) => ({
    comments: computed(() => {
      const node = nodesStore.nodes().find((it) => it.id === parentNodeId());

      if (!node) {
        return [];
      }

      return (
        node?.children?.filter(
          (it): it is CommentNode => it.type === 'comment',
        ) ?? []
      );
    }),
  })),
  withMethods((store) => ({
    setParentNode: (parentNodeId: string) => {
      if (parentNodeId) {
        patchState(store, {
          parentNodeId,
        });
      } else {
        patchState(store, initialState);
      }
    },
    clear() {
      patchState(store, initialState);
    },
  })),
);
