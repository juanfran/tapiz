import { Directive, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { concatLatestFrom } from '@ngrx/effects';
import { selectFocusId } from '../selectors/page.selectors';
import { BoardFacade } from '@/app/services/board-facade.service';
import { CopyPasteService } from '@/app/services/copy-paste.service';

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
  private copyPasteService = inject(CopyPasteService);

  public copy() {
    this.boardFacade
      .getNodes()
      .pipe(
        take(1),
        concatLatestFrom(() => [this.store.select(selectFocusId)]),
      )
      .subscribe(([nodes, focusId]) => {
        const copyNodes = nodes.filter((node) => focusId.includes(node.id));

        if (copyNodes) {
          navigator.clipboard.writeText(JSON.stringify(copyNodes));
        }
      });
  }

  public async paste() {
    this.copyPasteService.pasteCurrentClipboard({
      history: true,
      incX: 10,
      incY: 10,
    });
  }
}
