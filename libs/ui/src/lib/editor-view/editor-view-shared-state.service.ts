import { Injectable, signal, Signal } from '@angular/core';
import { Point, TNode } from '@tapiz/board-commons';
import type { Editor } from '@tiptap/core';
import { BehaviorSubject } from 'rxjs';
import { NodeToolbar } from '../toolbar/node-toolbar.model';
import { Portal } from '@angular/cdk/portal';

export interface EditorPortal {
  portal: Portal<unknown>;
  attached: boolean;
  node: {
    width: number;
    height: number;
    position: Point;
  };
}

@Injectable({
  providedIn: 'root',
})
export class EditorViewSharedStateService {
  #nodes = new BehaviorSubject<
    Record<
      string,
      {
        view: Editor;
        options: {
          layoutOptions: boolean;
          fontSize: boolean;
        };
        node: Signal<TNode<NodeToolbar>>;
      }
    >
  >({});

  editorPortal = signal<EditorPortal | null>(null);

  addNode(
    node: Signal<TNode<NodeToolbar>>,
    view: Editor,
    options: {
      layoutOptions: boolean;
      fontSize: boolean;
      defaultTextColor: string;
    },
  ) {
    const nodes = this.#nodes.getValue();
    nodes[node().id] = { view, options, node };
    this.#nodes.next({
      ...nodes,
    });
  }

  removeNode(id: string) {
    const nodes = this.#nodes.getValue();
    delete nodes[id];
    this.#nodes.next({
      ...nodes,
    });
  }

  getNodes$() {
    return this.#nodes.asObservable();
  }
}
