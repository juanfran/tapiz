import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Note, Point, User } from '@team-up/board-commons';
import { BoardActions } from '../actions/board.actions';
import { selectLayer } from '../selectors/page.selectors';
import { BoardFacade } from '../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NodesActions } from '@team-up/nodes/services/nodes-actions';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  #store = inject(Store);
  #layer = this.#store.selectSignal(selectLayer);
  #boardFacade = inject(BoardFacade);
  #settings = toSignal(this.#boardFacade.getSettings());
  #nodesActions = inject(NodesActions);

  getNew(data: Pick<Note, 'ownerId' | 'position' | 'layer'>): Note {
    return {
      text: '',
      votes: [],
      emojis: [],
      drawing: [],
      width: 300,
      height: 300,
      ...data,
    };
  }

  createNote(userId: User['id'], position: Point) {
    const anonymousMode = this.#settings()?.content.anonymousMode ?? false;

    const note = this.getNew({
      ownerId: anonymousMode ? '' : userId,
      layer: this.#layer(),
      position,
    });

    const action = this.#nodesActions.add<Note>('note', note);

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [action],
      }),
    );
  }
}
