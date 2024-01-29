import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Note, Point, User } from '@team-up/board-commons';
import { v4 } from 'uuid';
import { BoardActions } from '../actions/board.actions';
import { selectLayer } from '../selectors/page.selectors';
import { BoardFacade } from '../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  #store = inject(Store);
  #layer = this.#store.selectSignal(selectLayer);
  #boardFacade = inject(BoardFacade);
  #settings = toSignal(this.#boardFacade.getSettings());

  getNew(data: Pick<Note, 'ownerId' | 'position' | 'layer'>): Note {
    return {
      text: '',
      votes: [],
      emojis: [],
      drawing: [],
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

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [
          {
            data: {
              type: 'note',
              id: v4(),
              content: note,
            },
            op: 'add',
          },
        ],
      }),
    );
  }
}
