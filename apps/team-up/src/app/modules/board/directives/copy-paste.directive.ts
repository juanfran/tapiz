import { Directive, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { concatLatestFrom } from '@ngrx/effects';
import { selectFocusId } from '../selectors/page.selectors';
import { v4 } from 'uuid';
import { NodeAdd, Point, TuNode } from '@team-up/board-commons';
import { PageActions } from '../actions/page.actions';
import { BoardFacade } from '@/app/services/board-facade.service';

@Directive({
  selector: '[teamUpCopyPaste]',
  standalone: true,
})
export class CopyPasteDirective {
  @HostListener('document:keydown.control.c') public copyEvent() {
    this.copy();
  }

  @HostListener('document:keydown.control.v') public pasteEvent() {
    this.paste();
  }

  private store = inject(Store);
  private boardFacade = inject(BoardFacade);
  private copyNode: TuNode[] = [];

  public copy() {
    this.boardFacade
      .getNodes()
      .pipe(
        take(1),
        concatLatestFrom(() => [this.store.select(selectFocusId)]),
      )
      .subscribe(([nodes, focusId]) => {
        this.copyNode = [];

        const copyNodes = nodes.filter((node) => focusId.includes(node.id));

        if (copyNodes) {
          this.copyNode.push(
            ...copyNodes.map((node) => {
              const newNode = structuredClone(node);

              if ('position' in newNode.content) {
                newNode.content.position = {
                  x: (newNode.content.position as Point).x + 10,
                  y: (newNode.content.position as Point).y + 10,
                };
              }

              return newNode;
            }),
          );
        }
      });
  }

  public paste() {
    if (!this.copyNode.length) {
      return;
    }

    const nodes: NodeAdd['data'][] = this.copyNode.map((it) => {
      return {
        ...it,
        id: v4(),
      };
    });

    this.store.dispatch(PageActions.pasteNodes({ nodes, history: true }));
  }
}
