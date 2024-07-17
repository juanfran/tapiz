import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  signal,
  inject,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { selectIsAdmin } from '../../selectors/page.selectors';
import { ExportService } from '../../services/export.service';
import { ClickOutside } from 'ngxtension/click-outside';
import { AutoFocusDirective } from '../../directives/autofocus.directive';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ShareBoardComponent } from '../share-board/share-board.component';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardSettingsComponent } from '../board-settings/board-settings.component';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'tapiz-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink,
    SvgIconComponent,
    AutoFocusDirective,
    ClickOutside,
    MatIconModule,
    MatDialogModule,
  ],
  providers: [HotkeysService],
})
export class HeaderComponent {
  #exportService = inject(ExportService);
  #store = inject(Store);
  #dialog = inject(MatDialog);
  #hotkeysService = inject(HotkeysService);
  #configService = inject(ConfigService);

  textarea = viewChild<ElementRef<HTMLInputElement>>('textarea');

  edit = signal(false);
  boardMode = this.#store.selectSignal(pageFeature.selectBoardMode);
  name = this.#store.selectSignal(pageFeature.selectName);
  isAdmin = this.#store.selectSignal(selectIsAdmin);
  boardId = this.#store.selectSignal(pageFeature.selectBoardId);

  get isDemo() {
    return !!this.#configService.config.DEMO;
  }

  constructor() {
    toObservable(this.edit)
      .pipe(
        takeUntilDestroyed(),
        switchMap((edit) => {
          if (edit) {
            return this.#hotkeysService.listen({ key: 'Escape' });
          }
          return [];
        }),
      )
      .subscribe(() => {
        this.edit.set(false);
      });
  }

  changeBoardMode(boardMode: number) {
    this.#store.dispatch(
      PageActions.changeBoardMode({
        boardMode,
      }),
    );
  }

  export() {
    this.#exportService.getExportFile().then(
      (url) => {
        const fileLink = document.createElement('a');

        fileLink.href = url;
        fileLink.download = `${this.boardId()}.json`;
        fileLink.click();
      },
      () => {
        console.error('export error');
      },
    );
  }

  editName() {
    this.edit.set(true);
  }

  enter(event: Event) {
    event.preventDefault();

    if (event.target) {
      this.edit.set(false);

      const name = (event.target as HTMLTextAreaElement).innerText;
      this.#store.dispatch(BoardActions.setBoardName({ name }));
    }
  }

  clickOutside() {
    this.edit.set(false);

    const el = this.textarea()?.nativeElement;

    if (!el) {
      return;
    }

    const name = el.innerText;

    if (name !== this.name()) {
      this.#store.dispatch(BoardActions.setBoardName({ name }));
    }
  }

  share() {
    this.#dialog.open(ShareBoardComponent, {
      width: '600px',
      autoFocus: 'dialog',
    });
  }

  settings() {
    this.#dialog.open(BoardSettingsComponent, {
      width: '600px',
      autoFocus: 'dialog',
    });
  }
}
