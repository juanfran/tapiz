import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { CommentNode, TuNode } from '@team-up/board-commons';

import { NodesStore } from '../services/nodes.store';

type CommentsState = {
  parentNodeId: TuNode['id'] | undefined;
  comments: CommentNode[];
};

const initialState: CommentsState = {
  parentNodeId: undefined,
  comments: [],
};

export const CommentsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, nodesStore = inject(NodesStore)) => ({
    setParentNode: (parentNodeId: string) => {
      const node = nodesStore.nodes().find((it) => it.id === parentNodeId);

      if (node) {
        const comments =
          node.children?.filter(
            (it): it is CommentNode => it.type === 'comment',
          ) ?? [];

        patchState(store, {
          parentNodeId,
          comments,
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
