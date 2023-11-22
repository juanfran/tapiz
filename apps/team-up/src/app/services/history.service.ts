import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TuNode } from '@team-up/board-commons';
import { PageActions } from '../modules/board/actions/page.actions';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private store = inject(Store);
  public editingNodes = new Map<string, TuNode>();

  public initEdit(node: TuNode) {
    this.editingNodes.set(node.id, node);
  }

  public finishEdit(node: TuNode) {
    const previousState = this.editingNodes.get(node.id);

    if (previousState) {
      this.editingNodes.delete(node.id);

      const diffPrev: Record<string, unknown> = {};
      const diffCurr: Record<string, unknown> = {};

      Object.entries(node.content).forEach(([key, value]) => {
        const content = previousState.content as Record<string, unknown>;

        if (content[key] !== value) {
          diffPrev[key] = content[key];
          diffCurr[key] = value;
        }
      });

      if (Object.keys(diffCurr).length) {
        this.store.dispatch(
          PageActions.nodeSnapshot({
            prev: {
              ...previousState,
              content: diffPrev,
            },
            curr: {
              ...node,
              content: diffCurr,
            },
          }),
        );
      }
    }
  }
}
