import { Injectable, signal, Signal } from '@angular/core';
import { Point, TuNode } from '@tapiz/board-commons';
import type { Editor } from '@tiptap/core';
import { BehaviorSubject } from 'rxjs';
import { NodeToolbar } from '../toolbar/node-toolbar.model';
import { Portal } from '@angular/cdk/portal';

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

  editorPortal = signal<{
    portal: Portal<unknown>;
    attached: boolean;
    node: {
      width: number;
      height: number;
      position: Point;
    };
  } | null>(null);

  addNode(
    node: Signal<TuNode<NodeToolbar>>,
    view: Editor,
    options: {
      layoutOptions: boolean;
      fontSize: boolean;
      defaultTextColor: string;
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
