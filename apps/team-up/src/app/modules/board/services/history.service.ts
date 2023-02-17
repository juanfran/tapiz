import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { PageActions } from '../actions/page.actions';
import hotkeys from 'hotkeys-js';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  constructor(private store: Store) {}

  public listen() {
    hotkeys('ctrl+z', () => {
      this.undo();
    });

    hotkeys('ctrl+y', () => {
      this.redo();
    });
  }

  public undo() {
    this.store.dispatch(PageActions.undo());
  }

  public redo() {
    this.store.dispatch(PageActions.redo());
  }
}
