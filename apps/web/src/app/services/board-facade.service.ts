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
import { concatLatestFrom } from '@ngrx/effects';
import * as R from 'remeda';
import { toSignal } from '@angular/core/rxjs-interop';

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
  }

  public get() {
    return this.board.get();
  }

  public applyActions(actions: StateActions[], history = false) {
    this.board.actions(actions, history);
  }

  public getNodes() {
    return this.board.sync();
  }

  public patchHistory(fn: Parameters<typeof this.board.patchHistory>[0]) {
    this.board.patchHistory(fn);
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
      return R.equals(prev, curre);
    }),
    share(),
  );

  public readonly selectFocusNodes = toSignal(this.selectFocusNodes$, {
    initialValue: [],
  });

  public undo() {
    return this.board.undo(false);
  }

  public redo() {
    return this.board.redo(false);
  }
}
