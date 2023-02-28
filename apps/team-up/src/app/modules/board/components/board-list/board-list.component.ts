import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Board } from '@team-up/board-commons';
import { PageActions } from '@/app/modules/board/actions/page.actions';
import { selectBoards } from '@/app/modules/board/selectors/page.selectors';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmComponent } from '../confirm-action/confirm-actions.component';
import { exhaustMap, filter } from 'rxjs';
import { BoardApiService } from '../../services/board-api.service';

@UntilDestroy()
@Component({
  selector: 'team-up-board-list',
  templateUrl: './board-list.component.html',
  styleUrls: ['./board-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class BoardListComponent implements OnInit {
  public readonly model$ = this.state.select();

  constructor(
    private boardApiService: BoardApiService,
    private router: Router,
    private store: Store,
    private state: RxState<{
      boards: Board[];
    }>,
    private dialog: MatDialog
  ) {
    this.state.connect('boards', this.store.select(selectBoards));
  }

  public ngOnInit() {
    this.store.dispatch(PageActions.fetchBoards());
  }

  public logout() {
    document.cookie = '';
    localStorage.removeItem('auth');
    localStorage.removeItem('user');
    this.store.dispatch(PageActions.setUserId({ userId: '' }));
    this.router.navigate(['/login']);
  }

  public onSubmit(value: string) {
    this.store.dispatch(
      PageActions.createBoard({
        name: value.trim().length ? value : 'New board',
      })
    );
  }

  public goBoard(board: Board) {
    this.router.navigate(['/board/', board.id]);
  }

  public deleteBoard(event: Event, board: Board) {
    event.stopPropagation();

    this.store.dispatch(PageActions.removeBoard({ id: board.id }));
  }

  public deleteAccount() {
    const dialogRef = this.dialog.open(ConfirmComponent, {
      data: {
        title: 'Delete account?',
        description:
          'This will delete all your account. Your boards will still be accessible by other users.',
        confirm: {
          text: 'Delete account',
          color: 'warn',
        },
        cancel: {
          text: 'Cancel',
          color: 'basic',
        },
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((it) => it),
        exhaustMap(() => {
          return this.boardApiService.removeAccount();
        })
      )
      .subscribe(() => {
        this.logout();
      });
  }
}
