import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { CommentNode, TuNode } from '@team-up/board-commons';
import { BoardFacade } from '../../../../services/board-facade.service';
import { distinctUntilChanged, filter, map, pipe, switchMap, tap } from 'rxjs';
import * as R from 'remeda';
import { filterNil } from 'ngxtension/filter-nil';

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
  withMethods((store, boardFacade = inject(BoardFacade)) => ({
    setParentNode: rxMethod<CommentsState['parentNodeId']>(
      pipe(
        tap((parentNodeId) => {
          patchState(store, {
            parentNodeId,
          });
        }),
        filterNil(),
        switchMap((parentNodeId) => {
          return boardFacade.selectNode(parentNodeId).pipe(
            filter((node): node is TuNode => {
              if (!node) {
                patchState(store, initialState);
              }

              return !!node;
            }),
            map((node) => {
              return (
                node.children?.filter(
                  (it): it is CommentNode => it.type === 'comment',
                ) ?? []
              );
            }),
            distinctUntilChanged((prev, curr) => {
              return R.equals(prev, curr);
            }),
            tap((comments) => {
              patchState(store, {
                comments: comments as CommentNode[],
              });
            }),
          );
        }),
      ),
    ),
    clear() {
      patchState(store, initialState);
    },
  })),
);
