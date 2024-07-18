import { Injectable, inject } from '@angular/core';

import { Store } from '@ngrx/store';
import {
  BoardSettings,
  StateActions,
  TuNode,
  UserNode,
  isNote,
} from '@tapiz/board-commons';
import { syncNodeBox } from '@tapiz/sync-node-box';
import {
  Observable,
  combineLatest,
  distinctUntilChanged,
  map,
  share,
} from 'rxjs';
import { pageFeature } from '../modules/board/reducers/page.reducer';
import { concatLatestFrom } from '@ngrx/operators';
import * as R from 'remeda';
import { addLog, addRawLog } from '../debug/debug';

const isBoardSettings = (it: TuNode): it is TuNode<BoardSettings> => {
  return it.type === 'settings';
};

@Injectable({ providedIn: 'root' })
export class BoardFacade {
  private board = syncNodeBox({ log: false });
  private store = inject(Store);

  public start() {
    this.board.update(() => {
      return [];
    });
    addRawLog('start');
  }

  public get() {
    return this.board.get();
  }

  public applyActions(actions: StateActions[], history = false) {
    const state = this.board.actions(actions, history);

    addLog('facade', actions, state);
  }

  public getNodes() {
    return this.board.sync();
  }

  public patchHistory(fn: Parameters<typeof this.board.patchHistory>[0]) {
    this.board.patchHistory(fn);
    addRawLog('patchHistory');
  }

  public getUsers(): Observable<UserNode[]> {
    return this.getNodes().pipe(
      map((nodes) => nodes.filter((it): it is UserNode => it.type === 'user')),
    );
  }

  public getSettings(): Observable<TuNode<BoardSettings> | undefined> {
    return this.getNodes().pipe(
      map((nodes) => {
        return nodes.find((it) => isBoardSettings(it)) as
          | TuNode<BoardSettings>
          | undefined;
      }),
    );
  }

  public selectNotes() {
    return this.getNodes().pipe(map((nodes) => nodes.filter(isNote)));
  }

  public selectUserById(id: string) {
    return this.getUsers().pipe(
      map((nodes) => nodes.find((it) => it.id === id)),
    );
  }

  public selectCursors() {
    return this.getUsers().pipe(
      concatLatestFrom(() => this.store.select(pageFeature.selectUserId)),
      map(([users, currentUser]) => {
        return users.filter((user) => {
          return (
            !!user.content.cursor &&
            user.content.connected &&
            user.id !== currentUser
          );
        });
      }),
      map((nodes) => nodes.map((it) => it.content)),
    );
  }

  public usernameById(userId: UserNode['id']) {
    return this.getUsers().pipe(
      map((users) => {
        const user = users.find((user) => userId === user.id);

        return user?.content.name ?? '';
      }),
    );
  }

  public selectNode(id: string) {
    return this.getNodes().pipe(
      map((nodes) => {
        return nodes.find((node) => node.id === id);
      }),
    );
  }

  public readonly selectFocusNodes$ = combineLatest([
    this.store.select(pageFeature.selectFocusId),
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

  public undo() {
    const actions = this.board.undo(false);

    addLog('facade', actions, {});

    return actions;
  }

  public redo() {
    const actions = this.board.redo(false);

    addLog('facade', actions, {});

    return actions;
  }
}
