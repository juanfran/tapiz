import { Directive, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { BoardFacade } from '../../../services/board-facade.service';
import { CopyPasteService } from '../../../services/copy-paste.service';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { NotificationService } from '../../../shared/notification/notification.service';
import { boardPageFeature } from '../reducers/boardPage.reducer';

@Directive({
  selector: '[tapizCopyPaste]',
})
export class CopyPasteDirective {
  @HostListener('document:keydown.control.c') public copyEvent() {
    if (!isInputField() && !(document.getSelection() ?? '').toString().length) {
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
  private notificationService = inject(NotificationService);
  private selectFocusId = this.store.selectSignal(
    boardPageFeature.selectFocusId,
  );

  public copy() {
    const nodes = this.boardFacade.nodes();

    const copyNodes = nodes.filter((node) =>
      this.selectFocusId().includes(node.id),
    );

    if (copyNodes) {
      const hasReadText = navigator.clipboard.readText as unknown;
      if (hasReadText) {
        navigator.clipboard.writeText(JSON.stringify(copyNodes));
      } else {
        this.notificationService.open({
          message: 'Your browser does not support clipboard access.',
          action: 'Close',
          type: 'info',
        });
      }
    }
  }

  public async paste() {
    this.copyPasteService.pasteCurrentClipboard({
      history: true,
      incX: 10,
      incY: 10,
    });
  }
}
