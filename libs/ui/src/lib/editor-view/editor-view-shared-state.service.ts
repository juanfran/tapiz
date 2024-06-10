import { Injectable, Signal } from '@angular/core';
import { TuNode } from '@tapiz/board-commons';
import type { Editor } from '@tiptap/core';
import { BehaviorSubject } from 'rxjs';
import { NodeToolbar } from '../toolbar/node-toolbar.model';

@Injectable({
  providedIn: 'root',
})
export class EditorViewSharedStateService {
  #nodes = new BehaviorSubject<
    Map<
      string,
      {
        view: Editor;
        options: {
          layoutOptions: boolean;
          fontSize: boolean;
        };
        node: Signal<TuNode<NodeToolbar>>;
      }
    >
  >(new Map());

  addNode(
    node: Signal<TuNode<NodeToolbar>>,
    view: Editor,
    options: {
      layoutOptions: boolean;
      fontSize: boolean;
    },
  ) {
    this.#nodes.next(
      this.#nodes.getValue().set(node().id, {
        view,
        options,
        node,
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
