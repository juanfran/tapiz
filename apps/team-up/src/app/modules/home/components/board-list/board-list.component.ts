import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RxFor } from '@rx-angular/template/for';
import { Board, SortBoard } from '@team-up/board-commons';
import { Router, RouterModule } from '@angular/router';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmComponent } from '@/app/shared/confirm-action/confirm-actions.component';
import { filter } from 'rxjs';
import { BoardIdToColorDirective } from '@/app/shared/board-id-to-color.directive';
import { RenameBoardComponent } from '../rename-board/rename-board.component';
import { MatSelectModule } from '@angular/material/select';
import { homeFeature } from '../../+state/home.feature';
import { TransferBoardComponent } from '../transfer-board/transfer-board.component';

@Component({
  selector: 'team-up-board-list',
  standalone: true,
  imports: [
    CommonModule,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    MatIconModule,
    BoardIdToColorDirective,
    RouterModule,
    MatDialogModule,
    MatSelectModule,
    RxFor,
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
  public listBoards = signal([] as Board[]);

  public sortedBoards = computed(() => {
    const list = [...this.listBoards()];

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

  @Input()
  public set boards(boards: Board[]) {
    this.listBoards.set(boards);
  }

  public sortByField(fieldName: string) {
    return (a: Record<string, string>, b: Record<string, string>) =>
      a[fieldName] > b[fieldName] ? 1 : -1;
  }

  public goBoard(board: Board) {
    this.router.navigate(['/board/', board.id]);
  }

  public duplicateBoard(board: Board) {
    this.store.dispatch(HomeActions.duplicateBoard({ id: board.id }));
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

  public transferBoard(board: Board) {
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
          })
        );
      });
  }

  public renameBoard(board: Board) {
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
          })
        );
      });
  }

  public addStar(board: Board) {
    this.store.dispatch(
      HomeActions.starBoard({
        id: board.id,
      })
    );
  }

  public removeStar(board: Board) {
    this.store.dispatch(
      HomeActions.unstarBoard({
        id: board.id,
      })
    );
  }

  public changeSortBy(sortBy: SortBoard) {
    this.store.dispatch(
      HomeActions.changeBoardSortBy({
        sortBy,
      })
    );
  }
}
