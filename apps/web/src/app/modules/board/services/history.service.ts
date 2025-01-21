import { Injectable } from '@angular/core';
import { TuNode } from '@tapiz/board-commons';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private eventSubject = new Subject<{ prev: TuNode; curr: TuNode }>();

  public editingNodes = new Map<string, TuNode>();

  public event$ = this.eventSubject.asObservable();

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
