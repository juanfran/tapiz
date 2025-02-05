import { Injectable, computed, inject } from '@angular/core';

import { Store } from '@ngrx/store';
import {
  BoardSettings,
  BoardTuNode,
  StateActions,
  TuNode,
  UserNode,
  isNote,
  isTimer,
} from '@tapiz/board-commons';
import { syncNodeBox } from '@tapiz/sync-node-box';
import {
  Observable,
  animationFrameScheduler,
  auditTime,
  combineLatest,
  distinctUntilChanged,
  map,
  share,
} from 'rxjs';
import { boardPageFeature } from '../modules/board/reducers/boardPage.reducer';
import { concatLatestFrom } from '@ngrx/operators';
import * as R from 'remeda';
import { addLog, addRawLog } from '../debug/debug';
import { toSignal } from '@angular/core/rxjs-interop';

const isBoardSettings = (it: TuNode): it is TuNode<BoardSettings> => {
  return it.type === 'settings';
};

@Injectable({ providedIn: 'root' })
export class BoardFacade {
  private board = syncNodeBox({ log: false });
  private store = inject(Store);

  users = toSignal(
    this.getUsers().pipe(map((users) => users.map((user) => user.content))),
    { initialValue: [] },
  );
  userId = this.store.selectSignal(boardPageFeature.selectUserId);
  currentUser = computed(() => {
    return this.users()?.find((user) => user.id === this.userId());
  });
  nodes = toSignal(this.getNodes(), { initialValue: [] });
  timer = computed(() => {
    return this.nodes().find((it) => isTimer(it))?.content;
  });

  start() {
    this.board.update(() => {
      return [];
    });
    addRawLog('start');
  }

  get() {
    return this.board.get();
  }

  getNode(id: string) {
    return this.board.getNode(id);
  }

  setState(nodes: TuNode[]) {
    this.board.update(() => {
      return nodes;
    });
    addRawLog('setState');
  }

  applyActions(actions: StateActions[], history = false) {
    const state = this.board.actions(actions, history);

    addLog('facade', actions, state);
  }

  getNodes() {
    return this.board.sync().pipe(auditTime(20, animationFrameScheduler));
  }

  patchHistory(fn: Parameters<typeof this.board.patchHistory>[0]) {
    this.board.patchHistory(fn);
    addRawLog('patchHistory');
  }

  getUsers(): Observable<UserNode[]> {
    return this.getNodes().pipe(
      map((nodes) => nodes.filter((it): it is UserNode => it.type === 'user')),
    );
  }

  getSettings(): Observable<TuNode<BoardSettings> | undefined> {
    return this.getNodes().pipe(
      map((nodes) => {
        return nodes.find((it) => isBoardSettings(it)) as
          | TuNode<BoardSettings>
          | undefined;
      }),
      distinctUntilChanged(),
    );
  }

  selectNotes() {
    return this.getNodes().pipe(map((nodes) => nodes.filter(isNote)));
  }

  selectUserById(id: string) {
    return this.getUsers().pipe(
      map((nodes) => nodes.find((it) => it.id === id)),
    );
  }
  selectCursors() {
    return this.getUsers().pipe(
      concatLatestFrom(() => [
        this.store.select(boardPageFeature.selectUserId),
        this.store.select(boardPageFeature.selectBoardUsers),
      ]),
      map(([users, currentUser, boardUsers]) => {
        return users
          .filter((user) => {
            return (
              !!user.content.cursor &&
              user.content.connected &&
              user.id !== currentUser
            );
          })
          .map((user) => {
            const boardUser = boardUsers.find((bu) => bu.id === user.id);
            return {
              ...user.content,
              picture: boardUser?.picture,
            };
          });
      }),
    );
  }

  usernameById(userId: UserNode['id']) {
    return this.getUsers().pipe(
      map((users) => {
        const user = users.find((user) => userId === user.id);

        return user?.content.name ?? '';
      }),
    );
  }

  selectNode(id: string) {
    return this.getNodes().pipe(
      map((nodes) => {
        return nodes.find((node) => node.id === id);
      }),
    );
  }

  selectNodes(id: string[]) {
    return this.getNodes().pipe(
      map((nodes) => {
        return nodes.filter((node) => id.includes(node.id));
      }),
    );
  }

  filterBoardNodes(nodes: TuNode[]) {
    return nodes.filter(
      (it) => !['user', 'settings', 'timer'].includes(it.type),
    ) as BoardTuNode[];
  }

  readonly selectFocusNodes$ = combineLatest([
    this.store.select(boardPageFeature.selectFocusId),
    this.getNodes(),
  ]).pipe(
    map(([focusId, nodes]) => {
      return nodes.filter((note) => focusId.includes(note.id));
    }),
    distinctUntilChanged((prev, curre) => {
      return R.isDeepEqual(prev, curre);
    }),
    share(),
  );

  undo() {
    const actions = this.board.undo(false);

    addLog('facade', actions, {});

    return actions;
  }

  redo() {
    const actions = this.board.redo(false);

    addLog('facade', actions, {});

    return actions;
  }
}
