import { Injectable, inject } from '@angular/core';
import { TuNode } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { BoardPageActions } from '../actions/board-page.actions';

@Injectable({
  providedIn: 'root',
})
export class NodesStore {
  #store = inject(Store);

  setFocusNode(event: { id: string; ctrlKey: boolean }) {
    this.#store.dispatch(
      BoardPageActions.setFocusId({
        focusId: event.id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  deleteNodes(nodes: { id: string; type: string }[], history?: boolean) {
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
  }

  copyNodes(nodes: TuNode[]) {
    navigator.clipboard.writeText(JSON.stringify(nodes));
  }

  fetchMentions() {
    this.#store.dispatch(BoardPageActions.fetchMentions());
  }

  mentionUser(userId: string, nodeId: string) {
    this.#store.dispatch(
      BoardPageActions.mentionUser({
        userId,
        nodeId,
      }),
    );
  }
}
