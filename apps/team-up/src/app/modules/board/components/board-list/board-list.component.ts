import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Board } from '@team-up/board-commons';
import { PageActions } from '@/app/modules/board/actions/page.actions';
import { selectBoards } from '@/app/modules/board/selectors/page.selectors';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmComponent } from '../confirm-action/confirm-actions.component';
import { exhaustMap, filter, tap } from 'rxjs';
import { BoardApiService } from '../../services/board-api.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { AuthService } from '@/app/services/auth.service';
import { BoardIdToColorDirective } from '../../directives/board-id-to-color.directive';
import { TitleComponent } from '../title/title.component';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';

@UntilDestroy()
@Component({
  selector: 'team-up-board-list',
  templateUrl: './board-list.component.html',
  styleUrls: ['./board-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    NgFor,
    RouterLink,
    AsyncPipe,
    BoardIdToColorDirective,
    TitleComponent,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
  ],
})
export class BoardListComponent implements OnInit {
  public readonly model$ = this.state.select();

  constructor(
    private authService: AuthService,
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
    this.authService.logout();
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

  public deleteBoard(board: Board) {
    const dialogRef = this.dialog.open(ConfirmComponent, {
      data: {
        title: 'Are you sure?',
        description: 'This will delete all your board data.',
        confirm: {
          text: 'Delete board',
          color: 'warn',
        },
        cancel: {
          text: 'Cancel',
          color: 'basic',
        },
        align: 'end',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe(() => {
        this.store.dispatch(PageActions.removeBoard({ id: board.id }));
      });
  }

  public leaveBoard(board: Board) {
    this.store.dispatch(PageActions.leaveBoard({ id: board.id }));
  }

  public duplicateBoard(board: Board) {
    this.store.dispatch(PageActions.duplicateBoard({ id: board.id }));
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
        align: 'end',
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
