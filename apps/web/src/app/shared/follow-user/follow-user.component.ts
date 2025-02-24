import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../modules/board/reducers/boardPage.reducer';
import { BoardPageActions } from '../../modules/board/actions/board-page.actions';
import { MatButtonModule } from '@angular/material/button';
import { BoardFacade } from '../../services/board-facade.service';
import { explicitEffect } from 'ngxtension/explicit-effect';

@Component({
  selector: 'tapiz-follow-user',
  imports: [MatButtonModule],
  template: `
    @if (userToFollow(); as user) {
      <button
        (click)="stopFollowingUser()"
        mat-raised-button
        color="primary">
        Stop following {{ user.name }}
      </button>
    }
  `,
  styleUrls: ['./follow-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowUserComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);
  #follow = this.#store.selectSignal(boardPageFeature.selectFollow);

  userToFollow = computed(() => {
    return this.#boardFacade.usersNodes().find((it) => it.id === this.#follow())
      ?.content;
  });

  stopFollowingUser() {
    this.#store.dispatch(BoardPageActions.followUser({ id: '' }));
  }

  constructor() {
    explicitEffect([this.userToFollow], ([user]) => {
      if (user?.position && user?.zoom) {
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
