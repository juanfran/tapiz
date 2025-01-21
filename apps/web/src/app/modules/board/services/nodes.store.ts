import { Injectable, inject } from '@angular/core';
import { TuNode } from '@tapiz/board-commons';
import { rxActions } from '@rx-angular/state/actions';
import { Store } from '@ngrx/store';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { BoardPageActions } from '../actions/board-page.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class NodesStore {
  #store = inject(Store);

  actions = rxActions<{
    deleteNodes: { nodes: { id: string; type: string }[]; history?: boolean };
    copyNodes: { nodes: TuNode[] };
    fetchMentions: void;
    mentionUser: { userId: string; nodeId: string };
  }>();

  constructor() {
    this.actions.copyNodes$.subscribe(({ nodes }) => {
      navigator.clipboard.writeText(JSON.stringify(nodes));
    });

    this.actions.deleteNodes$.subscribe(({ nodes, history }) => {
      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: history ?? true,
          actions: nodes.map((node) => {
            return {
              data: {
                type: node.type,
                id: node.id,
              },
              op: 'remove',
            };
          }),
        }),
      );
    });

    this.actions.mentionUser$
      .pipe(takeUntilDestroyed())
      .subscribe(({ userId, nodeId }) => {
        this.#store.dispatch(
          BoardPageActions.mentionUser({
            userId,
            nodeId,
          }),
        );
      });

    this.actions.fetchMentions$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.#store.dispatch(BoardPageActions.fetchMentions());
    });
  }

  setFocusNode(event: { id: string; ctrlKey: boolean }) {
    this.#store.dispatch(
      BoardPageActions.setFocusId({
        focusId: event.id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }
}
