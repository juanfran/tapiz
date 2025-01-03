import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  signal,
  inject,
  viewChild,
  input,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { selectIsAdmin, selectUserId } from '../../selectors/page.selectors';
import { ExportService } from '../../services/export.service';
import { ClickOutside } from 'ngxtension/click-outside';
import { AutoFocusDirective } from '../../directives/autofocus.directive';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ShareBoardComponent } from '../share-board/share-board.component';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardSettingsComponent } from '../board-settings/board-settings.component';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { computed } from '@angular/core';
import { ConfigService } from '../../../../services/config.service';
import { NgOptimizedImage } from '@angular/common';
import { appFeature } from '../../../../+state/app.reducer';
import { MatButtonModule } from '@angular/material/button';
import { BoardFacade } from '../../../../services/board-facade.service';

@Component({
  selector: 'tapiz-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AutoFocusDirective,
    ClickOutside,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    NgOptimizedImage,
  ],
  providers: [HotkeysService],
})
export class HeaderComponent {
  #exportService = inject(ExportService);
  #store = inject(Store);
  #dialog = inject(MatDialog);
  #hotkeysService = inject(HotkeysService);
  #boardFacade = inject(BoardFacade);
  #boardUsers = this.#store.selectSignal(pageFeature.selectBoardUsers);
  #configService = inject(ConfigService);
  #users = toSignal(
    this.#boardFacade
      .getUsers()
      .pipe(map((users) => users.map((user) => user.content))),
    { initialValue: [] },
  );
  userId = this.#store.selectSignal(selectUserId);
  users = computed(() => {
    const boardUsers = this.#boardUsers();

    return this.#users()
      .filter((user) => user.id !== this.userId())
      .map((user) => {
        const boardUser = boardUsers.find(
          (boardUser) => boardUser.id === user.id,
        );

        return {
          ...user,
          picture: boardUser?.picture,
        };
      });
  });
  #settings = toSignal(this.#boardFacade.getSettings(), { initialValue: null });

  showUsers = computed(() => {
    return !this.#settings()?.content.anonymousMode;
  });

  textarea = viewChild<ElementRef<HTMLInputElement>>('textarea');

  allowSwitchMode = input(true);

  edit = signal(false);
  boardMode = this.#store.selectSignal(pageFeature.selectBoardMode);
  name = this.#store.selectSignal(pageFeature.selectName);
  isAdmin = this.#store.selectSignal(selectIsAdmin);
  boardId = this.#store.selectSignal(pageFeature.selectBoardId);
  teamName = this.#store.selectSignal(pageFeature.selectTeamName);
  teamId = this.#store.selectSignal(pageFeature.selectTeamId);
  user = this.#store.selectSignal(appFeature.selectUser);

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
