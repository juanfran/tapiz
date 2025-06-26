import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { BoardPageActions } from '../../actions/board-page.actions';
import { User } from '@tapiz/board-commons';
import { NgOptimizedImage } from '@angular/common';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { BoardFacade } from '../../../../services/board-facade.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tapiz-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    MatIconModule,
    NgOptimizedImage,
  ],
})
export class UsersComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);
  #boardUsers = this.#store.selectSignal(boardPageFeature.selectBoardUsers);
  #users = this.#boardFacade.users;
  #settings = this.#boardFacade.settings;

  boardMode = this.#store.selectSignal(boardPageFeature.selectBoardMode);
  showUsers = computed(() => {
    return !this.#settings()?.content.anonymousMode;
  });
  users = computed(() => {
    const boardUsers = this.#boardUsers();

    return this.#users()
      .filter((user) => user.id !== this.userId())
      .map((user) => {
        const boardUser = boardUsers.find(
          (boardUser) => boardUser.id === user.id,
        );

        return {
          ...user,
          picture: boardUser?.picture,
        };
      });
  });
  menuPosition = [
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
    },
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
    },
  ];

  userId = this.#store.selectSignal(boardPageFeature.selectUserId);
  userHighlight = this.#store.selectSignal(
    boardPageFeature.selectUserHighlight,
  );
  isFollowing = this.#store.selectSignal(boardPageFeature.selectFollow);
  currentUser = computed(() => {
    return this.#users()?.find((user) => user.id === this.userId());
  });
  hideNoteAuthor = computed(
    () => !!this.#boardFacade.settings()?.content.hideNoteAuthor,
  );

  userPicture = computed(() => {
    const boardUsers = this.#boardUsers();
    const userId = this.userId();
    const user = boardUsers.find((boardUser) => boardUser.id === userId);
    return user?.picture || '';
  });

  toggleUserHighlight(userId: User['id']) {
    this.#store.dispatch(BoardPageActions.toggleUserHighlight({ id: userId }));
  }

  follow(userId: User['id']) {
    this.#store.dispatch(BoardPageActions.followUser({ id: userId }));
  }

  goToUser(userId: User['id']) {
    this.#store.dispatch(BoardPageActions.goToUser({ id: userId }));
  }

  showVotes(userId: User['id']) {
    this.#store.dispatch(BoardPageActions.toggleShowVotes({ userId }));
  }
}
