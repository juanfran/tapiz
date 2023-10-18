import { Injectable, inject } from '@angular/core';

import { Store } from '@ngrx/store';
import { StateActions, UserNode, isNote } from '@team-up/board-commons';
import { syncNodeBox } from '@team-up/sync-node-box';
import { Observable, combineLatest, map } from 'rxjs';
import { pageFeature } from '../modules/board/reducers/page.reducer';

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
      map((nodes) => nodes.filter((it): it is UserNode => it.type === 'user'))
    );
  }

  public selectNotes() {
    return this.getNodes().pipe(map((nodes) => nodes.filter(isNote)));
  }

  public selectUserById(id: string) {
    return this.getUsers().pipe(
      map((nodes) => nodes.find((it) => it.id === id))
    );
  }

  public selectCursors() {
    return this.getUsers().pipe(
      map((users) =>
        users.filter((user) => !!user.content.cursor && user.content.connected)
      ),
      map((nodes) => nodes.map((it) => it.content))
    );
  }

  public usernameById(userId: UserNode['id']) {
    return this.getUsers().pipe(
      map((users) => {
        const user = users.find((user) => userId === user.id);

        return user?.content.name ?? '';
      })
    );
  }

  public selectNode(id: string) {
    return this.getNodes().pipe(
      map((nodes) => {
        return nodes.find((node) => node.id === id);
      })
    );
  }

  public selectNoteFocus() {
    return combineLatest([
      this.store.select(pageFeature.selectFocusId),
      this.getNodes(),
    ]).pipe(
      map(([focusId, nodes]) => {
        return nodes.filter(isNote).find((note) => focusId.includes(note.id));
      })
    );
  }

  public undo() {
    return this.board.undo();
  }

  public redo() {
    return this.board.redo();
  }
}
