import { Directive, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { concatLatestFrom } from '@ngrx/effects';
import { selectFocusId } from '../selectors/page.selectors';
import { BoardFacade } from '../../../services/board-facade.service';
import { CopyPasteService } from '../../../services/copy-paste.service';
import { isInputField } from '@team-up/cdk/utils/is-input-field';

@Directive({
  selector: '[teamUpCopyPaste]',
  standalone: true,
})
export class CopyPasteDirective {
  @HostListener('document:keydown.control.c') public copyEvent() {
    if (!isInputField()) {
      this.copy();
    }
  }

  @HostListener('document:keydown.control.v') public pasteEvent() {
    if (!isInputField()) {
      this.paste();
    }
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
