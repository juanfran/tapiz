import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { NodeAdd, Point, TuNode } from '@tapiz/board-commons';
import { PageActions } from '../modules/board/actions/page.actions';
import { pageFeature } from '../modules/board/reducers/page.reducer';

@Injectable({
  providedIn: 'root',
})
export class CopyPasteService {
  private store = inject(Store);

  public readonly layer = this.store.selectSignal(pageFeature.selectBoardMode);

  public getNodes(text: string): TuNode[] {
    try {
      return JSON.parse(text);
    } catch (_) {
      return [];
    }
  }

  public async pasteCurrentClipboard(options?: {
    history?: boolean;
    x?: number;
    y?: number;
    incX?: number;
    incY?: number;
  }) {
    const hasReadText = navigator.clipboard.readText as unknown;

    if (!hasReadText) {
      return;
    }

    const text = await navigator.clipboard.readText();
    const copyNode = this.getNodes(text);

    if (!copyNode.length) {
      return;
    }

    const nodes: NodeAdd['data'][] = copyNode.map((it, index): TuNode => {
      if ('position' in it.content) {
        if (options?.x && options?.y) {
          it.content.position = {
            x: options.x + index * 10,
            y: options.y + index * 10,
          };
        } else if (options?.incX || options?.incY) {
          it.content.position = {
            x: (it.content.position as Point).x + (options?.incX ?? 0),
            y: (it.content.position as Point).y + (options?.incY ?? 0),
          };
        }

        if (it.children) {
          it.children = it.children.map((child) => {
            return {
              ...child,
              id: '',
            };
          });
        }
      }

      return {
        ...it,
        content: {
          ...it.content,
          layer: this.layer(),
        },
        id: '',
      };
    });

    this.store.dispatch(
      PageActions.pasteNodes({ nodes, history: options?.history ?? true }),
    );
  }
}
