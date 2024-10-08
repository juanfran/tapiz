import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { Store } from '@ngrx/store';
import {
  selectUserHighlight,
  selectUserId,
} from '../../selectors/page.selectors';
import { PageActions } from '../../actions/page.actions';
import { BoardActions } from '../../actions/board.actions';
import { User } from '@tapiz/board-commons';
import { map } from 'rxjs/operators';
import { NgClass, NgOptimizedImage } from '@angular/common';
import {
  CdkMenu,
  CdkMenuItem,
  CdkMenuItemRadio,
  CdkMenuTrigger,
} from '@angular/cdk/menu';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardFacade } from '../../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tapiz-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgClass,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    MatIconModule,
    CdkMenuItemRadio,
    NgOptimizedImage,
  ],
})
export class UsersComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);
  #boardUsers = this.#store.selectSignal(pageFeature.selectBoardUsers);
  #users = toSignal(
    this.#boardFacade
      .getUsers()
      .pipe(map((users) => users.map((user) => user.content))),
    { initialValue: [] },
  );
  #settings = toSignal(this.#boardFacade.getSettings(), { initialValue: null });

  boardMode = this.#store.selectSignal(pageFeature.selectBoardMode);
  showUsers = computed(() => {
    return !this.#settings()?.content.anonymousMode;
  });
  users = computed(() => {
    const boardUsers = this.#boardUsers();

    return this.#users()
      .filter((user) => user.id !== this.userId())
      .map((user) => {
        console.log(boardUsers);
        const boardUser = boardUsers.find(
          (boardUser) => boardUser.id === user.id,
        );

        return {
          ...user,
          picture: boardUser?.picture,
        };
      });
  });

  userId = this.#store.selectSignal(selectUserId);
  userHighlight = this.#store.selectSignal(selectUserHighlight);
  isFollowing = this.#store.selectSignal(pageFeature.selectFollow);
  currentUser = computed(() => {
    return this.#users()?.find((user) => user.id === this.userId());
  });
  visible = computed(() => this.currentUser()?.visible);

  setVisibility(visible: boolean) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          {
            data: {
              type: 'user',
              id: this.userId(),
              content: {
                visible,
              },
            },
            op: 'patch',
          },
        ],
      }),
    );
  }

  toggleUserHighlight(userId: User['id']) {
    this.#store.dispatch(PageActions.toggleUserHighlight({ id: userId }));
  }

  follow(userId: User['id']) {
    this.#store.dispatch(PageActions.followUser({ id: userId }));
  }

  goToUser(userId: User['id']) {
    this.#store.dispatch(PageActions.goToUser({ id: userId }));
  }

  showVotes(userId: User['id']) {
    this.#store.dispatch(PageActions.toggleShowVotes({ userId }));
  }
}
