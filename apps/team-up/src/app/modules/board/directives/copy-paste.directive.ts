import { Directive, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllNodes } from '../selectors/board.selectors';
import { take } from 'rxjs';
import { concatLatestFrom } from '@ngrx/effects';
import { selectFocusId, selectUserId } from '../selectors/page.selectors';
import type { RequireAtLeastOne } from 'type-fest';
import { v4 } from 'uuid';
import { AddNode, NodeType, Point } from '@team-up/board-commons';
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
  private copyNode: {
    nodeType: NodeType;
    node: ValidCopyNode;
  }[] = [];

  public copy() {
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
        this.copyNode = [];

        for (const [key, list] of Object.entries(nodes)) {
          const nodes = list
            .filter((node) => focusId.includes(node.id))
            .filter((node) => {
              const hasOwner = 'ownerId' in node;

              return !hasOwner || (hasOwner && node.ownerId === userId);
            });

          this.copyNode.push(
            ...nodes.map((node) => {
              const newNode = { ...node };

              if ('position' in newNode) {
                newNode.position = {
                  x: (newNode.position as Point).x + 10,
                  y: (newNode.position as Point).y + 10,
                };
              }

              return {
                nodeType: key as NodeType,
                node: newNode,
              };
            })
          );
        }
      });
  }

  public paste() {
    if (!this.copyNode.length) {
      return;
    }

    const nodes = this.copyNode.map((it) => {
      return {
        nodeType: it.nodeType,
        node: {
          ...it.node,
          id: v4(),
        },
      };
    });

    this.store.dispatch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      PageActions.pasteNodes({ nodes: nodes as any[] })
    );
  }
}