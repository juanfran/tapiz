import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  selectUserHighlight,
  selectUserId,
} from '../../selectors/page.selectors';
import { RxState } from '@rx-angular/state';
import { PageActions } from '../../actions/page.actions';
import { BoardActions } from '../../actions/board.actions';
import { User } from '@tapiz/board-commons';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { NgClass, AsyncPipe } from '@angular/common';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardFacade } from '../../../../services/board-facade.service';

interface State {
  visible: boolean;
  users: User[];
  userId: User['id'];
  userHighlight: User['id'] | null;
  currentUser?: User;
  follow: string;
  showUsers: boolean;
}

interface ComponentViewModel {
  visible: boolean;
  users: User[];
  currentUser?: User;
  userHighlight: User['id'] | null;
  follow: string;
  showUsers: boolean;
}

@Component({
  selector: 'tapiz-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [
    SvgIconComponent,
    NgClass,
    AsyncPipe,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
  ],
})
export class UsersComponent {
  private store = inject(Store);
  private state = inject<RxState<State>>(RxState<State>);
  private boardFacade = inject(BoardFacade);

  boardMode = this.store.selectSignal(pageFeature.selectBoardMode);

  constructor() {
    this.state.connect(
      'users',
      this.boardFacade
        .getUsers()
        .pipe(map((users) => users.map((user) => user.content))),
    );
    this.state.connect(
      'showUsers',
      this.boardFacade.getSettings().pipe(
        map((settings) => {
          if (!settings) {
            return true;
          }

          return !settings.content.anonymousMode;
        }),
      ),
    );
    this.state.connect('userId', this.store.select(selectUserId));
    this.state.connect('userHighlight', this.store.select(selectUserHighlight));
    this.state.connect('follow', this.store.select(pageFeature.selectFollow));
    this.state.connect(
      'currentUser',
      combineLatest([
        this.state.select('users'),
        this.state.select('userId'),
      ]).pipe(
        map(([users, userId]) => {
          return users.find((user) => user.id === userId);
        }),
      ),
    );
  }

  public readonly viewModel$: Observable<ComponentViewModel> = this.state
    .select()
    .pipe(
      map(
        ({ users, userId, currentUser, userHighlight, follow, showUsers }) => {
          return {
            visible: currentUser?.visible ?? false,
            users: users.filter((user) => user.id !== userId),
            currentUser,
            userHighlight,
            follow,
            showUsers,
          };
        },
      ),
    );

  public toggleVisibility() {
    this.store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          {
            data: {
              type: 'user',
              id: this.state.get('userId'),
              content: {
                visible: !this.state.get('currentUser')?.visible,
              },
            },
            op: 'patch',
          },
        ],
      }),
    );
  }

  public toggleUserHighlight(userId: User['id']) {
    this.store.dispatch(PageActions.toggleUserHighlight({ id: userId }));
  }

  public follow(userId: User['id']) {
    this.store.dispatch(PageActions.followUser({ id: userId }));
  }

  public goToUser(userId: User['id']) {
    this.store.dispatch(PageActions.goToUser({ id: userId }));
  }

  public showVotes(userId: User['id']) {
    this.store.dispatch(PageActions.toggleShowVotes({ userId }));
  }
}
