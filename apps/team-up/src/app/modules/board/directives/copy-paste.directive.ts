import { Directive, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllNodes } from '../selectors/board.selectors';
import { take } from 'rxjs';
import { concatLatestFrom } from '@ngrx/effects';
import { selectFocusId, selectUserId } from '../selectors/page.selectors';
import type { RequireAtLeastOne } from 'type-fest';
import { v4 } from 'uuid';
import { NodeType } from '@team-up/board-commons';
import { PageActions } from '../actions/page.actions';

type ValidCopyNode = RequireAtLeastOne<Record<string, unknown>, 'id'>;

@Directive({
  selector: '[tuCopyPaste]',
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
  private copyNode?: {
    nodeType: NodeType;
    data: ValidCopyNode;
  };

  public copy() {
    this.copyNode = undefined;

    this.store
      .select(selectAllNodes())
      .pipe(
        take(1),
        concatLatestFrom(() => [
          this.store.select(selectFocusId),
          this.store.select(selectUserId),
        ])
      )
      .subscribe(([nodes, focusId, userId]) => {
        for (const [key, list] of Object.entries(nodes)) {
          const node = list.find((node) => node.id === focusId);

          if (node) {
            if ('ownerId' in node && node.ownerId !== userId) {
              break;
            }

            this.copyNode = {
              nodeType: key as NodeType,
              data: { ...node },
            };
            break;
          }
        }
      });
  }

  public paste() {
    if (!this.copyNode) {
      return;
    }

    this.copyNode.data.id = v4();

    this.store.dispatch(
      PageActions.pasteNode({
        nodeType: this.copyNode.nodeType,
        node: {
          ...this.copyNode.data,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );
  }
}
