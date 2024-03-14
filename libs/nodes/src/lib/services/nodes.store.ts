import { Injectable, inject } from '@angular/core';
import { TuNode, User } from '@team-up/board-commons';
import { rxState } from '@rx-angular/state';
import { BehaviorSubject } from 'rxjs';
import { rxActions } from '@rx-angular/state/actions';
import { Store } from '@ngrx/store';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';

interface NodesState {
  users: User[];
  userId: string;
  zoom: number;
  privateId: string;
  canvasMode: string;
}

const initialState: NodesState = {
  users: [],
  userId: '',
  zoom: 1,
  privateId: '',
  canvasMode: 'editMode',
};

@Injectable({
  providedIn: 'root',
})
export class NodesStore {
  private store = inject(Store);

  // todo: find a better way to connect page state with nodes state, work for standalone nodes
  public users$ = new BehaviorSubject<User[]>([]);
  public userId$ = new BehaviorSubject('');
  public zoom$ = new BehaviorSubject(1);
  public privateId$ = new BehaviorSubject('');
  public canvasMode$ = new BehaviorSubject('editMode');

  actions = rxActions<{
    deleteNodes: { nodes: { id: string; type: string }[]; history?: boolean };
    copyNodes: { nodes: TuNode[] };
  }>();

  #state = rxState<NodesState>(({ set, connect }) => {
    set(initialState);

    connect('users', this.users$.asObservable());
    connect('userId', this.userId$.asObservable());
    connect('zoom', this.zoom$.asObservable());
    connect('privateId', this.privateId$.asObservable());
    connect('canvasMode', this.canvasMode$.asObservable());

    this.actions.copyNodes$.subscribe(({ nodes }) => {
      navigator.clipboard.writeText(JSON.stringify(nodes));
    });

    this.actions.deleteNodes$.subscribe(({ nodes, history }) => {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: history ?? true,
          actions: nodes.map((node) => {
            return {
              data: {
                type: node.type,
                id: node.id,
              },
              op: 'remove',
            };
          }),
        }),
      );
    });
  });

  users = this.#state.signal('users');
  userId = this.#state.signal('userId');
  zoom = this.#state.signal('zoom');
  privateId = this.#state.signal('privateId');
  canvasMode = this.#state.signal('canvasMode');
}
