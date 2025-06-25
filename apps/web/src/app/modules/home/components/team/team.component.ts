import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { homeFeature } from '../../+state/home.feature';
import { HomeActions } from '../../+state/home.actions';
import { BoardListComponent } from '../board-list/board-list.component';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';
import { TitleComponent } from '../../../../shared/title/title.component';
import { input } from '@angular/core';
import { TeamMenuComponent } from '../team-menu/team-menu.component';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { InfiniteScrollBoardsComponent } from '../infinite-scroll-boards/infinite-scroll-boards.component';
import { EmptyBoardsComponent } from '../empty-boards/empty-boards.component';
import { SortBoard } from '@tapiz/board-commons';

@Component({
  selector: 'tapiz-team',
  styleUrls: ['./team.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TitleComponent,
    BoardListComponent,
    BoardListHeaderComponent,
    TeamMenuComponent,
    EmptyBoardsComponent,
    InfiniteScrollBoardsComponent,
  ],
  template: `
    @if (team(); as team) {
      <tapiz-infinite-scroll-boards (scrolled)="onScroll()">
        <tapiz-title [title]="'Team ' + team.name"></tapiz-title>
        <tapiz-board-list-header [teamId]="team.id">
          <div class="team-name">
            <h1>
              {{ team.name }}

              @if (space(); as space) {
                <span class="space-name">- {{ space.name }}</span>
              }
            </h1>

            <tapiz-team-menu [team]="team"></tapiz-team-menu>
          </div>
        </tapiz-board-list-header>

        @if (boards().length) {
          <tapiz-board-list
            [boards]="boards()"
            [sortBy]="sortBy()"
            (sortedBy)="onSortBy($event)"></tapiz-board-list>
        } @else if (!loading()) {
          <tapiz-empty-boards [teamId]="teamId()" />
        }
      </tapiz-infinite-scroll-boards>
    }
  `,
})
export class TeamComponent {
  #store = inject(Store);

  teamId = input.required<string>();
  spaceId = injectQueryParams('spaceId');

  boards = this.#store.selectSignal(homeFeature.selectBoards);
  #teamSpaces = this.#store.selectSignal(homeFeature.selectCurrentTeamSpaces);
  #teams = this.#store.selectSignal(homeFeature.selectTeams);

  #boardsOffet = signal(0);
  #boardsLimit = signal(50);

  space = computed(() => {
    return this.#teamSpaces().find((it) => it.id === this.spaceId());
  });

  sortBy = signal<SortBoard>(
    (localStorage.getItem('boardSortBy') as SortBoard) ?? '-createdAt',
  );

  loading = this.#store.selectSignal(homeFeature.selectLoadingBoards);

  team = computed(() => {
    return this.#teams().find((it) => it.id === this.teamId());
  });

  constructor() {
    explicitEffect([this.teamId], () => {
      this.#boardsOffet.set(0);

      this.#store.dispatch(HomeActions.initBoardsPage());
      this.#store.dispatch(
        HomeActions.fetchTeamSpaces({ teamId: this.teamId() }),
      );
    });

    explicitEffect(
      [this.#boardsOffet, this.teamId, this.spaceId, this.sortBy],
      () => {
        this.#store.dispatch(
          HomeActions.fetchBoardsPage({
            spaceId: this.spaceId() ?? undefined,
            teamId: this.teamId(),
            offset: this.#boardsOffet(),
            limit: this.#boardsLimit(),
            sortBy: this.sortBy(),
          }),
        );
      },
    );
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
