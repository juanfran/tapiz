import { TitleComponent } from '../../../../shared/title/title.component';
import { Component, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateBoardComponent } from '../create-board/create-board.component';
import { filter, map } from 'rxjs';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { MatButtonModule } from '@angular/material/button';
import { BoardUser } from '@tapiz/board-commons';
import { RxState } from '@rx-angular/state';
import { homeFeature } from '../../+state/home.feature';
import { CommonModule } from '@angular/common';
import { BoardListComponent } from '../board-list/board-list.component';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';

interface State {
  boards: BoardUser[];
}

@Component({
  selector: 'tapiz-starred',
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
    @if (model$ | async; as vm) {
      <tapiz-title title="Starred"></tapiz-title>
      <tapiz-board-list-header>
        <h1>Starred</h1>
      </tapiz-board-list-header>
      <tapiz-board-list [boards]="vm.boards"></tapiz-board-list>
    }
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
