import { Injectable } from '@angular/core';
import { User } from '@team-up/board-commons';
import { rxState } from '@rx-angular/state';
import { BehaviorSubject } from 'rxjs';

interface NodesState {
  users: User[];
  userId: string;
}

const initialState: NodesState = {
  users: [],
  userId: '',
};

@Injectable({ providedIn: 'root' })
export class NodesStore {
  // todo: find a better way to connect page state with nodes state, work for standalone nodes
  public users$ = new BehaviorSubject<User[]>([]);
  public userId$ = new BehaviorSubject('');

  #state = rxState<NodesState>(({ set, connect }) => {
    set(initialState);

    connect('users', this.users$.asObservable());
    connect('userId', this.userId$.asObservable());
  });

  users = this.#state.signal('users');
  userId = this.#state.signal('userId');
}
