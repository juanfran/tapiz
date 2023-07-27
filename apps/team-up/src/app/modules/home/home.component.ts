import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Board } from '@team-up/board-commons';
import { Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '@/app/services/auth.service';

import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ConfirmComponent } from '@/app/shared/confirm-action/confirm-actions.component';
import { TitleComponent } from '@/app/shared/title/title.component';
import { BoardIdToColorDirective } from '@/app/shared/board-id-to-color.directive';
import { homeFeature } from './+state/home.feature';
import { HomeActions } from './+state/home.actions';

@UntilDestroy()
@Component({
  selector: 'team-up-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    BoardIdToColorDirective,
    TitleComponent,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    MatDialogModule,
  ],
})
export class HomeComponent implements OnInit {
  public readonly model$ = this.state.select();

  constructor(
    private authService: AuthService,
    private router: Router,
    private store: Store,
    private state: RxState<{
      boards: Board[];
    }>,
    private dialog: MatDialog
  ) {
    this.state.connect('boards', this.store.select(homeFeature.selectBoards));
  }

  public ngOnInit() {
    this.store.dispatch(HomeActions.fetchBoards());
  }

  public logout() {
    this.authService.logout();
  }

  public onSubmit(value: string) {
    this.store.dispatch(
      HomeActions.createBoard({
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
        this.store.dispatch(HomeActions.removeBoard({ id: board.id }));
      });
  }

  public leaveBoard(board: Board) {
    this.store.dispatch(HomeActions.leaveBoard({ id: board.id }));
  }

  public duplicateBoard(board: Board) {
    this.store.dispatch(HomeActions.duplicateBoard({ id: board.id }));
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
      .pipe(filter((it) => it))
      .subscribe(() => {
        this.store.dispatch(HomeActions.removeAccount());
      });
  }
}
