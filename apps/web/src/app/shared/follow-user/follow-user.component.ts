import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../modules/board/reducers/boardPage.reducer';
import { map, switchMap } from 'rxjs';
import { filterNil } from '../../commons/operators/filter-nil';
import { BoardPageActions } from '../../modules/board/actions/board-page.actions';
import { MatButtonModule } from '@angular/material/button';
import { BoardFacade } from '../../services/board-facade.service';

@Component({
  selector: 'tapiz-follow-user',
  imports: [CommonModule, MatButtonModule],
  template: `
    @if (userToFollow$ | async) {
      <button
        (click)="stopFollowingUser()"
        mat-raised-button
        color="primary">
        Stop following user
      </button>
    }
  `,
  styleUrls: ['./follow-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowUserComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);

  userToFollow$ = this.#store.select(boardPageFeature.selectFollow).pipe(
    switchMap((follow) => {
      return this.#boardFacade.getUsers().pipe(
        map((users) => {
          return users.find((user) => user.id === follow)?.content;
        }),
      );
    }),
  );

  stopFollowingUser() {
    this.#store.dispatch(BoardPageActions.followUser({ id: '' }));
  }

  constructor() {
    this.userToFollow$.pipe(filterNil()).subscribe((user) => {
      if (user.position && user.zoom) {
        this.#store.dispatch(
          BoardPageActions.setUserView({
            zoom: user.zoom,
            position: user.position,
          }),
        );
      }
    });
  }
}
