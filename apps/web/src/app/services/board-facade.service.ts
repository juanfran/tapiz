import { Injectable, computed, inject, signal } from '@angular/core';

import { Store } from '@ngrx/store';
import {
  BoardSettings,
  BoardTuNode,
  StateActions,
  TuNode,
  isTimer,
  isUserNode,
} from '@tapiz/board-commons';
import { syncNodeBox } from '@tapiz/sync-node-box';
import { boardPageFeature } from '../modules/board/reducers/boardPage.reducer';
import { addLog, addRawLog } from '../debug/debug';
import { toSignal } from '@angular/core/rxjs-interop';

const isBoardSettings = (it: TuNode): it is TuNode<BoardSettings> => {
  return it.type === 'settings';
};

@Injectable({ providedIn: 'root' })
export class BoardFacade {
  private board = syncNodeBox({ log: false });
  private store = inject(Store);

  userId = this.store.selectSignal(boardPageFeature.selectUserId);
  boardUsers = this.store.selectSignal(boardPageFeature.selectBoardUsers);

  nodes = toSignal(this.#getNodes$(), { initialValue: [] });
  timer = computed(() => {
    return this.nodes().find((it) => isTimer(it))?.content;
  });

  usersNodes = computed(() => {
    return this.nodes().filter((it) => isUserNode(it));
  });

  users = computed(() => {
    return this.usersNodes().map((user) => user.content);
  });

  currentUser = computed(() => {
    return this.users()?.find((user) => user.id === this.userId());
  });

  tmpNode = signal<BoardTuNode | null>(null);

  cursors = computed(() => {
    return this.usersNodes()
      .filter((user) => {
        return (
          !!user.content.cursor &&
          user.content.connected &&
          user.id !== this.userId()
        );
      })
      .map((user) => {
        return {
          ...user.content,
          picture: this.boardUsers().find((bu) => bu.id === user.id)?.picture,
        };
      });
  });

  settings = computed(() => {
    return this.nodes().find((it) => isBoardSettings(it)) satisfies
      | TuNode<BoardSettings>
      | undefined;
  });

  focusIds = this.store.selectSignal(boardPageFeature.selectFocusId);

  focusNodes = computed(() => {
    return this.nodes().filter((note) => this.focusIds().includes(note.id));
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

  #getNodes$() {
    return this.board.sync();
  }

  patchHistory(fn: Parameters<typeof this.board.patchHistory>[0]) {
    this.board.patchHistory(fn);
    addRawLog('patchHistory');
  }

  filterBoardNodes(nodes: TuNode[]): BoardTuNode[] {
    return nodes.filter(
      (it) => !['user', 'settings', 'timer', 'arrow'].includes(it.type),
    ) as BoardTuNode[];
  }

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
