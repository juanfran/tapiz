import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Note, Point, User } from '@tapiz/board-commons';
import { BoardActions } from '../actions/board.actions';
import { BoardFacade } from '../../../services/board-facade.service';
import { NodesActions } from '../services/nodes-actions';
import { boardPageFeature } from '../reducers/boardPage.reducer';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  #store = inject(Store);
  #boardMode = this.#store.selectSignal(boardPageFeature.selectBoardMode);
  #boardFacade = inject(BoardFacade);
  #settings = this.#boardFacade.settings;
  #nodesActions = inject(NodesActions);
  #lastColor = '';

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
    if (color) {
      this.#lastColor = color;
    }

    const anonymousMode = this.#settings()?.content.anonymousMode ?? false;

    const note = this.getNew({
      ownerId: anonymousMode ? '' : userId,
      layer: this.#boardMode(),
      position,
    });

    if (this.#lastColor) {
      note.color = this.#lastColor;
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
