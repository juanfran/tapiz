import { Injectable } from '@angular/core';
import { Note } from '@team-up/board-commons';
import { v4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  getNew(data: Pick<Note, 'ownerId' | 'position'>): Note {
    return {
      ...data,
      id: v4(),
      text: '',
      votes: 0,
      emojis: [],
      drawing: [],
      ...data,
    };
  }
}
