import { TitleComponent } from '../../../../shared/title/title.component';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { BoardListComponent } from '../board-list/board-list.component';
import { homeFeature } from '../../+state/home.feature';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CreateBoardComponent } from '../create-board/create-board.component';
import { debounceTime, filter, switchMap } from 'rxjs';
import { SubscriptionService } from '../../../../services/subscription.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'tapiz-all-boards',
  styleUrls: ['./all-boards.component.scss'],
  template: `
    <tapiz-title title="Boards"></tapiz-title>
    <tapiz-board-list-header [showCreate]="!!boards().length">
      <h1>Boards</h1>
    </tapiz-board-list-header>
    @if (boards().length) {
      <tapiz-board-list [boards]="boards()"></tapiz-board-list>
    } @else if (!loading()) {
      <div class="empty">
        <h1>No boards</h1>
        <button
          mat-flat-button
          color="primary"
          (click)="createBoard()">
          Create your first board
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TitleComponent,
    BoardListComponent,
    BoardListHeaderComponent,
    MatButtonModule,
  ],
})
export class AllBoardsComponent {
  private store = inject(Store);
  private dialog = inject(MatDialog);
  private subscriptionService = inject(SubscriptionService);

  boards = this.store.selectSignal(homeFeature.selectBoards);
  loading = this.store.selectSignal(homeFeature.selectLoadingBoards);

  constructor() {
    this.store.dispatch(HomeActions.initAllBoardsPage());

    toObservable(this.boards)
      .pipe(
        debounceTime(100),
        switchMap((boards) => {
          return this.subscriptionService.watchBoardIds(
            boards.map((it) => it.id),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.store.dispatch(HomeActions.fetchAllBoards());
      });
  }

  public createBoard() {
    const dialogRef = this.dialog.open(CreateBoardComponent, {
      width: '400px',
      data: {
        teamId: null,
      },
    });
    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((newBoard) => {
        this.store.dispatch(
          HomeActions.createBoard({
            name: newBoard.name,
          }),
        );
      });
  }
}
