import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { homeFeature } from '../../+state/home.feature';
import { HomeActions } from '../../+state/home.actions';
import { BoardListComponent } from '../board-list/board-list.component';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';
import { TitleComponent } from '../../../../shared/title/title.component';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { InfiniteScrollBoardsComponent } from '../infinite-scroll-boards/infinite-scroll-boards.component';
import { SortBoard } from '@tapiz/board-commons';

@Component({
  selector: 'tapiz-starred',
  styleUrls: ['./starred.component.scss'],
  template: `
    <tapiz-infinite-scroll-boards (scrolled)="onScroll()">
      <tapiz-title title="Starred"></tapiz-title>
      <tapiz-board-list-header>
        <h1>Starred</h1>
      </tapiz-board-list-header>
      <tapiz-board-list
        [boards]="boards()"
        [sortBy]="sortBy()"
        (sortedBy)="onSortBy($event)"></tapiz-board-list>
    </tapiz-infinite-scroll-boards>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleComponent,
    BoardListComponent,
    BoardListHeaderComponent,
    InfiniteScrollBoardsComponent,
  ],
  providers: [RxState],
})
export class StarredComponent {
  #store = inject(Store);

  #boards = this.#store.selectSignal(homeFeature.selectBoards);
  boards = computed(() => {
    return this.#boards().filter((it) => it.starred);
  });

  #boardsOffet = signal(0);
  #boardsLimit = signal(50);
  sortBy = signal<SortBoard>(
    (localStorage.getItem('boardSortBy') as SortBoard) ?? '-createdAt',
  );

  constructor() {
    this.#store.dispatch(HomeActions.initBoardsPage());

    explicitEffect([this.#boardsOffet, this.sortBy], () => {
      this.#store.dispatch(
        HomeActions.fetchBoardsPage({
          starred: true,
          offset: this.#boardsOffet(),
          limit: this.#boardsLimit(),
          sortBy: this.sortBy(),
        }),
      );
    });
  }

  onScroll() {
    this.#boardsOffet.update((offset) => {
      return offset + this.#boardsLimit();
    });
  }

  onSortBy(sortBy: SortBoard) {
    this.#store.dispatch(HomeActions.initBoardsPage());

    this.sortBy.set(sortBy);
    this.#boardsOffet.set(0);
  }
}
