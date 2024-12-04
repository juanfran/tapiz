import { TitleComponent } from '../../../../shared/title/title.component';

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { BoardListComponent } from '../board-list/board-list.component';
import { homeFeature } from '../../+state/home.feature';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';
import { MatButtonModule } from '@angular/material/button';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { InfiniteScrollBoardsComponent } from '../infinite-scroll-boards/infinite-scroll-boards.component';
import { EmptyBoardsComponent } from '../empty-boards/empty-boards.component';
import { SortBoard } from '@tapiz/board-commons';

@Component({
  selector: 'tapiz-all-boards',
  styleUrls: ['./all-boards.component.scss'],
  template: `
    <tapiz-infinite-scroll-boards (scrolled)="onScroll()">
      <tapiz-title title="Boards"></tapiz-title>
      <tapiz-board-list-header [showCreate]="!!boards().length">
        <h1>Boards</h1>
      </tapiz-board-list-header>
      @if (boards().length) {
        <tapiz-board-list
          [boards]="boards()"
          [sortBy]="sortBy()"
          (sortedBy)="onSortBy($event)"></tapiz-board-list>
      } @else if (!loading()) {
        <tapiz-empty-boards />
      }
    </tapiz-infinite-scroll-boards>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleComponent,
    BoardListComponent,
    BoardListHeaderComponent,
    MatButtonModule,
    EmptyBoardsComponent,
    InfiniteScrollBoardsComponent,
  ],
})
export class AllBoardsComponent {
  #store = inject(Store);
  #boardsOffet = signal(0);
  #boardsLimit = signal(50);
  sortBy = signal<SortBoard>(
    (localStorage.getItem('boardSortBy') as SortBoard) ?? '-createdAt',
  );

  boards = this.#store.selectSignal(homeFeature.selectBoards);
  loading = this.#store.selectSignal(homeFeature.selectLoadingBoards);

  constructor() {
    this.#store.dispatch(HomeActions.initBoardsPage());

    explicitEffect([this.#boardsOffet, this.sortBy], () => {
      this.#store.dispatch(
        HomeActions.fetchBoardsPage({
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
