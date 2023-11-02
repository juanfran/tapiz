import { TitleComponent } from '@/app/shared/title/title.component';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { RxState } from '@rx-angular/state';
import { Board } from '@team-up/board-commons';
import { BoardListComponent } from '../board-list/board-list.component';
import { homeFeature } from '../../+state/home.feature';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';
interface State {
  boards: Board[];
}

@Component({
  selector: 'team-up-all-boards',
  styleUrls: ['./all-boards.component.scss'],
  template: `
    <ng-container *ngIf="model$ | async as vm">
      <team-up-title title="Boards"></team-up-title>
      <team-up-board-list-header>
        <h1>Boards</h1>
      </team-up-board-list-header>
      <team-up-board-list [boards]="vm.boards"></team-up-board-list>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TitleComponent,
    BoardListComponent,
    BoardListHeaderComponent,
  ],
})
export class AllBoardsComponent {
  private state = inject(RxState) as RxState<State>;
  private store = inject(Store);
  public model$ = this.state.select();

  constructor() {
    this.store.dispatch(HomeActions.initAllBoardsPage());

    this.state.connect('boards', this.store.select(homeFeature.selectBoards));
  }
}
