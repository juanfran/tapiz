import { Injectable } from '@angular/core';
import type { Editor } from '@tiptap/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EditorViewSharedStateService {
  #nodes = new BehaviorSubject<
    Map<
      string,
      {
        view: Editor;
      }
    >
  >(new Map());

  addNode(id: string, view: Editor) {
    this.#nodes.next(
      this.#nodes.getValue().set(id, {
        view,
      }),
    );
  }

  removeNode(id: string) {
    const nodes = this.#nodes.getValue();
    nodes.delete(id);
    this.#nodes.next(nodes);
  }

  getNodes$() {
    return this.#nodes.asObservable();
  }
}
