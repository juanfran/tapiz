import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  selectUserHighlight,
  selectUserId,
  selectVisible,
} from '../../selectors/page.selectors';
import { RxState } from '@rx-angular/state';
import { PageActions } from '../../actions/page.actions';
import { BoardActions } from '../../actions/board.actions';
import { User } from '@team-up/board-commons';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { pageFeature } from '../../reducers/page.reducer';
import { BoardFacade } from '@/app/services/board-facade.service';

interface State {
  visible: boolean;
  users: User[];
  userId: User['id'];
  userHighlight: User['id'] | null;
  follow: string;
}

interface ComponentViewModel {
  visible: boolean;
  users: User[];
  currentUser?: User;
  userHighlight: User['id'] | null;
  follow: string;
}

@Component({
  selector: 'team-up-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    SvgIconComponent,
    NgClass,
    AsyncPipe,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
  ],
})
export class UsersComponent {
  constructor(
    private store: Store,
    private state: RxState<State>,
    private boardFacade: BoardFacade
  ) {
    this.state.connect('visible', this.store.select(selectVisible));
    this.state.connect(
      'users',
      this.boardFacade
        .getUsers()
        .pipe(map((users) => users.map((user) => user.content)))
    );
    this.state.connect('userId', this.store.select(selectUserId));
    this.state.connect('userHighlight', this.store.select(selectUserHighlight));
    this.state.connect('follow', this.store.select(pageFeature.selectFollow));
  }

  public readonly viewModel$: Observable<ComponentViewModel> = this.state
    .select()
    .pipe(
      map(({ visible, users, userId, userHighlight, follow }) => {
        return {
          visible,
          users: users.filter((user) => user.id !== userId),
          currentUser: users.find((user) => user.id === userId),
          userHighlight,
          follow,
        };
      })
    );

  public toggleVisibility() {
    this.store.dispatch(
      BoardActions.setVisible({ visible: !this.state.get('visible') })
    );
  }

  public toggleUserHighlight(userId: User['id']) {
    this.store.dispatch(PageActions.toggleUserHighlight({ id: userId }));
  }

  public follow(userId: User['id']) {
    this.store.dispatch(PageActions.followUser({ id: userId }));
  }

  public showVotes(userId: User['id']) {
    this.store.dispatch(PageActions.toggleShowVotes({ userId }));
  }

  public trackById(_: number, user: User) {
    return user.id;
  }
}
