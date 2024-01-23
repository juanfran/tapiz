import { TitleComponent } from '../../../../shared/title/title.component';
import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateBoardComponent } from '../create-board/create-board.component';
import { filter, map } from 'rxjs';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { MatButtonModule } from '@angular/material/button';
import { Board } from '@team-up/board-commons';
import { RxState } from '@rx-angular/state';
import { homeFeature } from '../../+state/home.feature';
import { CommonModule } from '@angular/common';
import { BoardListComponent } from '../board-list/board-list.component';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';

interface State {
  boards: Board[];
}

@Component({
  selector: 'team-up-starred',
  styleUrls: ['./starred.component.scss'],
  standalone: true,
  imports: [
    TitleComponent,
    MatDialogModule,
    MatButtonModule,
    CommonModule,
    BoardListComponent,
    BoardListHeaderComponent,
  ],
  template: `
    <ng-container *ngIf="model$ | async as vm">
      <team-up-title title="Starred"></team-up-title>
      <team-up-board-list-header>
        <h1>Starred</h1>
      </team-up-board-list-header>

      <team-up-board-list [boards]="vm.boards"></team-up-board-list>
    </ng-container>
  `,
})
export class StarredComponent {
  private state = inject(RxState) as RxState<State>;
  private dialog = inject(MatDialog);
  private store = inject(Store);

  public model$ = this.state.select();

  constructor() {
    this.store.dispatch(HomeActions.initStarredPage());

    this.state.connect(
      'boards',
      this.store
        .select(homeFeature.selectBoards)
        .pipe(map((boards) => boards.filter((it) => it.starred))),
    );
  }

  public createBoard() {
    const dialogRef = this.dialog.open(CreateBoardComponent, {
      width: '400px',
      data: {},
    });
    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((newBoard) => {
        this.store.dispatch(
          HomeActions.createBoard({
            name: newBoard.name,
            teamId: newBoard.teamId,
          }),
        );
      });
  }
}
