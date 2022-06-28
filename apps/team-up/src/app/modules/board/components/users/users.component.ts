import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  selectUserHighlight,
  selectUserId,
  selectUsers,
  selectVisible,
} from '../../selectors/board.selectors';
import { RxState, selectSlice } from '@rx-angular/state';
import { setVisible, toggleUserHighlight } from '../../actions/board.actions';
import { User } from '@team-up/board-commons';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface State {
  visible: boolean;
  users: User[];
  userId: User['id'];
  userHighlight: User['id'] | null;
}

interface ComponentViewModel {
  visible: boolean;
  users: User[];
  currentUser?: User;
  userHighlight: User['id'] | null;
}

@Component({
  selector: 'team-up-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class UsersComponent {
  constructor(private store: Store, private state: RxState<State>) {
    this.state.connect('visible', this.store.select(selectVisible));
    this.state.connect('users', this.store.select(selectUsers));
    this.state.connect('userId', this.store.select(selectUserId));
    this.state.connect('userHighlight', this.store.select(selectUserHighlight));
  }

  public readonly viewModel$: Observable<ComponentViewModel> =
    this.state.select(
      selectSlice(['visible', 'users', 'userId', 'userHighlight']),
      map(({ visible, users, userId, userHighlight }) => ({
        visible,
        users: users.filter((user) => user.id !== userId && user.connected),
        currentUser: users.find((user) => user.id === userId),
        userHighlight,
      }))
    );

  public toggleVisibility() {
    this.store.dispatch(setVisible({ visible: !this.state.get('visible') }));
  }

  public toggleUserHighlight(userId: User['id']) {
    this.store.dispatch(toggleUserHighlight({ id: userId }));
  }

  public trackById(index: number, user: User) {
    return user.id;
  }
}
