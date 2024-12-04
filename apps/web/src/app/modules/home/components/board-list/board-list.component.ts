import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';

import { BoardUser, SortBoard } from '@tapiz/board-commons';
import { Router, RouterModule } from '@angular/router';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmComponent } from '../../../../shared/confirm-action/confirm-actions.component';
import { filter } from 'rxjs';
import { BoardIdToColorDirective } from '../../../../shared/board-id-to-color.directive';
import { RenameBoardComponent } from '../rename-board/rename-board.component';
import { MatSelectModule } from '@angular/material/select';
import { TransferBoardComponent } from '../transfer-board/transfer-board.component';
import { input } from '@angular/core';

@Component({
  selector: 'tapiz-board-list',
  imports: [
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    MatIconModule,
    BoardIdToColorDirective,
    RouterModule,
    MatDialogModule,
    MatSelectModule,
  ],
  styleUrls: ['./board-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board-options">
      <mat-form-field>
        <mat-label>Sort by</mat-label>
        <mat-select
          [value]="sortBy()"
          (valueChange)="changeSortBy($event)">
          <mat-option value="-createdAt">Newest First</mat-option>
          <mat-option value="createdAt">Oldest First</mat-option>
          <mat-option value="-lastAccess">Recently Accessed</mat-option>
          <mat-option value="lastAccess">Least Recently Accessed</mat-option>
          <mat-option value="name">Name</mat-option>
          <mat-option value="-name">Reverse Name</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    <div class="board-list">
      @for (board of boards(); track board.id) {
        <div class="board-item">
          <div
            (click)="goBoard(board)"
            class="board-bg"
            [tapizBoardIdToColor]="board.id">
            <a
              class="board-title"
              [routerLink]="['/board/', board.id]"
              >{{ board.name }}</a
            >
          </div>
          <div class="board-extra">
            <button
              type="button"
              title="Settings"
              [cdkMenuTriggerFor]="menu"
              mat-icon-button>
              <mat-icon fontIcon="more_vert"></mat-icon>
            </button>

            <ng-template #menu>
              <div
                class="menu"
                cdkMenu>
                @if (!board.starred) {
                  <button
                    cdkMenuItem
                    class="menu-item menu-item-icon"
                    title="Star"
                    (cdkMenuItemTriggered)="addStar(board)">
                    <mat-icon fontIcon="star"></mat-icon>
                    Star
                  </button>
                }
                @if (board.starred) {
                  <button
                    cdkMenuItem
                    class="menu-item menu-item-icon"
                    title="Unstar"
                    (cdkMenuItemTriggered)="removeStar(board)">
                    <mat-icon fontIcon="star"></mat-icon>
                    Unstar
                  </button>
                }
                @if (board.isAdmin) {
                  <button
                    cdkMenuItem
                    class="menu-item menu-item-icon"
                    title="Rename board"
                    (cdkMenuItemTriggered)="renameBoard(board)">
                    <mat-icon fontIcon="edit"></mat-icon>
                    Rename board
                  </button>
                }
                @if (board.isAdmin) {
                  <button
                    cdkMenuItem
                    class="menu-item menu-item-icon"
                    title="Transfer board"
                    (cdkMenuItemTriggered)="transferBoard(board)">
                    <mat-icon fontIcon="drive_file_move"></mat-icon>
                    Transfer board
                  </button>
                }
                <button
                  cdkMenuItem
                  class="menu-item menu-item-icon"
                  title="Duplicate board"
                  (cdkMenuItemTriggered)="duplicateBoard(board)">
                  <mat-icon fontIcon="content_copy"></mat-icon>
                  Duplicate
                </button>
                @if (board.isAdmin) {
                  <button
                    cdkMenuItem
                    class="menu-item menu-item-icon"
                    title="Delete board"
                    (cdkMenuItemTriggered)="deleteBoard(board)">
                    <mat-icon fontIcon="delete"></mat-icon>
                    Delete board
                  </button>
                }
                @if (board.role === 'guest') {
                  <button
                    cdkMenuItem
                    class="menu-item menu-item-icon"
                    title="Leave project"
                    (cdkMenuItemTriggered)="leaveBoard(board)">
                    <mat-icon fontIcon="directions_walk"></mat-icon>
                    Leave project
                  </button>
                }
              </div>
            </ng-template>
          </div>
        </div>
      }
    </div>
  `,
})
export class BoardListComponent {
  private router = inject(Router);
  private store = inject(Store);
  private dialog = inject(MatDialog);

  sortBy = input.required<SortBoard>();
  boards = input.required<BoardUser[]>();
  sortedBy = output<SortBoard>();

  sortByField(fieldName: string) {
    return (a: Record<string, string>, b: Record<string, string>) =>
      a[fieldName] > b[fieldName] ? 1 : -1;
  }

  goBoard(board: BoardUser) {
    this.router.navigate(['/board/', board.id]);
  }

  duplicateBoard(board: BoardUser) {
    this.store.dispatch(HomeActions.duplicateBoard({ id: board.id }));
  }

  deleteBoard(board: BoardUser) {
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

  leaveBoard(board: BoardUser) {
    this.store.dispatch(HomeActions.leaveBoard({ id: board.id }));
  }

  transferBoard(board: BoardUser) {
    const dialogRef = this.dialog.open(TransferBoardComponent, {
      width: '400px',
      data: {
        teamId: board.teamId,
      },
    });
    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((newBoard) => {
        this.store.dispatch(
          HomeActions.transferBoard({
            id: board.id,
            teamId: newBoard.teamId ?? null,
          }),
        );
      });
  }

  renameBoard(board: BoardUser) {
    const dialogRef = this.dialog.open(RenameBoardComponent, {
      width: '400px',
      autoFocus: 'dialog',
      data: {
        name: board.name,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((name) => {
        this.store.dispatch(
          HomeActions.renameBoard({
            id: board.id,
            name,
          }),
        );
      });
  }

  addStar(board: BoardUser) {
    this.store.dispatch(
      HomeActions.starBoard({
        id: board.id,
      }),
    );
  }

  removeStar(board: BoardUser) {
    this.store.dispatch(
      HomeActions.unstarBoard({
        id: board.id,
      }),
    );
  }

  changeSortBy(sortBy: SortBoard) {
    this.sortedBy.emit(sortBy);
  }
}
