import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { PageActions } from '../../actions/page.actions';
import { selectIsAdmin, selectUserId } from '../../selectors/page.selectors';
import { ExportService } from '../../services/export.service';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ShareBoardComponent } from '../share-board/share-board.component';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardSettingsComponent } from '../board-settings/board-settings.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { computed } from '@angular/core';
import { ConfigService } from '../../../../services/config.service';
import { MatButtonModule } from '@angular/material/button';
import { BoardFacade } from '../../../../services/board-facade.service';

@Component({
  selector: 'tapiz-board-header-options',
  templateUrl: './board-header-options.component.html',
  styleUrls: ['./board-header-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatDialogModule, MatButtonModule],
})
export class BoardHeaderOptionsComponent {
  #exportService = inject(ExportService);
  #store = inject(Store);
  #dialog = inject(MatDialog);
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

  allowSwitchMode = input(true);

  boardMode = this.#store.selectSignal(pageFeature.selectBoardMode);
  isAdmin = this.#store.selectSignal(selectIsAdmin);
  boardId = this.#store.selectSignal(pageFeature.selectBoardId);

  get isDemo() {
    return !!this.#configService.config.DEMO;
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
