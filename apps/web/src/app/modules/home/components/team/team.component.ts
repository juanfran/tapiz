import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { homeFeature } from '../../+state/home.feature';
import { debounceTime, filter, merge, switchMap, withLatestFrom } from 'rxjs';
import { HomeActions } from '../../+state/home.actions';
import { BoardListComponent } from '../board-list/board-list.component';
import { BoardListHeaderComponent } from '../board-list-header/board-list-header.component';
import { TitleComponent } from '../../../../shared/title/title.component';
import { SubscriptionService } from '../../../../services/subscription.service';
import { input } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TeamMenuComponent } from '../team-menu/team-menu.component';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { injectQueryParams } from 'ngxtension/inject-query-params';

@Component({
  selector: 'tapiz-team',
  styleUrls: ['./team.component.scss'],
  template: `
    @if (team(); as team) {
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
      <tapiz-board-list [boards]="boards()"></tapiz-board-list>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TitleComponent,
    BoardListComponent,
    BoardListHeaderComponent,
    TeamMenuComponent,
  ],
  providers: [RxState],
})
export class TeamComponent {
  #store = inject(Store);
  #subscriptionService = inject(SubscriptionService);

  id = input.required<string>();
  spaceId = injectQueryParams('spaceId');

  #boards = this.#store.selectSignal(homeFeature.selectBoards);
  #teamSpaces = this.#store.selectSignal(homeFeature.selectCurrentTeamSpaces);
  #teams = this.#store.selectSignal(homeFeature.selectTeams);

  space = computed(() => {
    return this.#teamSpaces().find((it) => it.id === this.spaceId());
  });
  boards = computed(() => {
    const space = this.space();

    if (!space) {
      return this.#boards();
    }

    return space.boards
      .map((spaceBoard) => {
        return this.#boards().find((it) => it.id === spaceBoard.id);
      })
      .filter((it) => !!it);
  });

  team = computed(() => {
    return this.#teams().find((it) => it.id === this.id());
  });

  constructor() {
    explicitEffect([this.id], ([teamId]) => {
      this.#store.dispatch(HomeActions.initTeamPage({ teamId }));
    });

    merge(
      toObservable(this.#boards).pipe(
        withLatestFrom(this.#store.select(homeFeature.selectLoadingBoards)),
        filter(([, loading]) => !loading),
        switchMap(([boards]) => {
          return this.#subscriptionService.watchBoardIds(
            boards.map((it) => it.id),
          );
        }),
      ),
      this.#subscriptionService
        .teamMessages()
        .pipe(filter((it) => it === this.id())),
    )
      .pipe(debounceTime(100), takeUntilDestroyed())
      .subscribe(() => {
        this.#store.dispatch(
          HomeActions.fetchTeamBoards({
            teamId: this.id(),
          }),
        );
      });
  }
}
