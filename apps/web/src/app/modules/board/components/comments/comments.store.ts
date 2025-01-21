import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { CommentNode, TuNode } from '@tapiz/board-commons';
import { BoardFacade } from '../../../../services/board-facade.service';

type CommentsState = {
  parentNodeId: TuNode['id'] | undefined;
};

const initialState: CommentsState = {
  parentNodeId: undefined,
};

export const CommentsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ parentNodeId }, boardFacade = inject(BoardFacade)) => ({
    comments: computed(() => {
      const node = boardFacade.nodes().find((it) => it.id === parentNodeId());

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
