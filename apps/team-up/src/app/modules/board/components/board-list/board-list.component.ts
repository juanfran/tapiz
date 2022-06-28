import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { Board } from '@team-up/board-commons';
import {
  createBoard,
  fetchBoards,
  removeBoard,
  setUserId,
} from '@/app/modules/board/actions/board.actions';
import { selectBoards } from '@/app/modules/board/selectors/board.selectors';
import { Router } from '@angular/router';

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
    private router: Router,
    private store: Store,
    private state: RxState<{
      boards: Board[];
    }>
  ) {
    this.state.connect('boards', this.store.select(selectBoards));
  }

  public ngOnInit() {
    this.store.dispatch(fetchBoards());
  }

  public logout() {
    document.cookie = '';
    localStorage.removeItem('auth');
    this.store.dispatch(setUserId({ userId: '' }));
  }

  public onSubmit(value: string) {
    this.store.dispatch(
      createBoard({
        name: value.trim().length ? value : 'New board',
      })
    );
  }

  public goBoard(board: Board) {
    this.router.navigate(['/board/', board.id]);
  }

  public deleteBoard(event: Event, board: Board) {
    event.stopPropagation();

    this.store.dispatch(removeBoard({ id: board.id }))
  }
}
