import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Note, Point, User } from '@tapiz/board-commons';
import { BoardActions } from '../actions/board.actions';
import { BoardFacade } from '../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NodesActions } from '@tapiz/nodes/services/nodes-actions';
import { pageFeature } from '../reducers/page.reducer';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  #store = inject(Store);
  #boardMode = this.#store.selectSignal(pageFeature.selectBoardMode);
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

  createNote(userId: User['id'], position: Point, color?: string) {
    const anonymousMode = this.#settings()?.content.anonymousMode ?? false;

    const note = this.getNew({
      ownerId: anonymousMode ? '' : userId,
      layer: this.#boardMode(),
      position,
    });

    if (color) {
      note.color = color;
    }

    const action = this.#nodesActions.add<Note>('note', note);

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [action],
      }),
    );
  }
}
