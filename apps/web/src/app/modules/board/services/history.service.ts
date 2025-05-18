import { Injectable } from '@angular/core';
import { TNode } from '@tapiz/board-commons';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private eventSubject = new Subject<{ prev: TNode; curr: TNode }>();

  public editingNodes = new Map<string, TNode>();

  public event$ = this.eventSubject.asObservable();

  public initEdit(node: TNode) {
    this.editingNodes.set(node.id, node);
  }

  public finishEdit(node: TNode) {
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
        this.eventSubject.next({
          prev: {
            ...previousState,
            content: diffPrev,
          },
          curr: {
            ...node,
            content: diffCurr,
          },
        });
      }
    }
  }
}
