import { Injectable, inject } from '@angular/core';
import { TuNode, User } from '@team-up/board-commons';
import { rxState } from '@rx-angular/state';
import { BehaviorSubject } from 'rxjs';
import { rxActions } from '@rx-angular/state/actions';
import { Store } from '@ngrx/store';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';
import { ContextMenuStore } from '@team-up/ui/context-menu/context-menu.store';

interface NodesState {
  users: User[];
  userId: string;
}

const initialState: NodesState = {
  users: [],
  userId: '',
};

@Injectable({
  providedIn: 'root',
})
export class NodesStore {
  private store = inject(Store);

  // todo: find a better way to connect page state with nodes state, work for standalone nodes
  public users$ = new BehaviorSubject<User[]>([]);
  public userId$ = new BehaviorSubject('');

  private contextMenuStore = inject(ContextMenuStore);

  actions = rxActions<{
    deleteNodes: { nodes: { id: string; type: string }[]; history?: boolean };
    copyNodes: { nodes: TuNode[] };
  }>();

  #state = rxState<NodesState>(({ set, connect }) => {
    set(initialState);

    connect('users', this.users$.asObservable());
    connect('userId', this.userId$.asObservable());

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

  public preBuildContextMenu(options: { el: HTMLElement; node: () => TuNode }) {
    this.contextMenuStore.config({
      element: options.el,
      items: () => {
        return [
          {
            label: 'Copy',
            icon: 'content_copy',
            help: 'Ctrl + C',
            action: () => {
              this.actions.copyNodes({ nodes: [options.node()] });
            },
          },
          {
            label: 'Delete',
            icon: 'delete',
            help: 'Supr',
            action: () => {
              this.actions.deleteNodes({
                nodes: [
                  {
                    id: options.node().id,
                    type: options.node().type,
                  },
                ],
              });
            },
          },
        ];
      },
    });
  }

  users = this.#state.signal('users');
  userId = this.#state.signal('userId');
}
