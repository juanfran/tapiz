import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { BoardUser, SortBoard } from '@team-up/board-commons';
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
import { homeFeature } from '../../+state/home.feature';
import { TransferBoardComponent } from '../transfer-board/transfer-board.component';
import { input } from '@angular/core';

@Component({
  selector: 'team-up-board-list',
  standalone: true,
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
  templateUrl: './board-list.component.html',
  styleUrls: ['./board-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardListComponent {
  private router = inject(Router);
  private store = inject(Store);
  private dialog = inject(MatDialog);

  public sortBy = this.store.selectSignal(homeFeature.selectSortBy);

  public sortedBoards = computed(() => {
    const list = [...this.boards()];

    list.sort((a, b) => {
      const sortyBy = this.sortBy();

      if (sortyBy === 'name') {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      } else if (sortyBy === '-name') {
        return a.name.toLowerCase() > b.name.toLowerCase() ? -1 : 1;
      } else if (sortyBy === 'createdAt') {
        return a.createdAt > b.createdAt ? 1 : -1;
      } else if (sortyBy === '-createdAt') {
        return a.createdAt > b.createdAt ? -1 : 1;
      } else if (sortyBy === 'lastAccess') {
        return a.lastAccessedAt > b.lastAccessedAt ? 1 : -1;
      } else if (sortyBy === '-lastAccess') {
        return a.lastAccessedAt > b.lastAccessedAt ? -1 : 1;
      }

      return 0;
    });

    return list;
  });

  boards = input.required<BoardUser[]>();

  public sortByField(fieldName: string) {
    return (a: Record<string, string>, b: Record<string, string>) =>
      a[fieldName] > b[fieldName] ? 1 : -1;
  }

  public goBoard(board: BoardUser) {
    this.router.navigate(['/board/', board.id]);
  }

  public duplicateBoard(board: BoardUser) {
    this.store.dispatch(HomeActions.duplicateBoard({ id: board.id }));
  }

  public deleteBoard(board: BoardUser) {
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

  public leaveBoard(board: BoardUser) {
    this.store.dispatch(HomeActions.leaveBoard({ id: board.id }));
  }

  public transferBoard(board: BoardUser) {
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

  public renameBoard(board: BoardUser) {
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

  public addStar(board: BoardUser) {
    this.store.dispatch(
      HomeActions.starBoard({
        id: board.id,
      }),
    );
  }

  public removeStar(board: BoardUser) {
    this.store.dispatch(
      HomeActions.unstarBoard({
        id: board.id,
      }),
    );
  }

  public changeSortBy(sortBy: SortBoard) {
    this.store.dispatch(
      HomeActions.changeBoardSortBy({
        sortBy,
      }),
    );
  }
}
