import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { first } from 'rxjs/operators';
import { selectBoardState } from '../selectors/board.selectors';
import { Note, TuNode, isNote } from '@team-up/board-commons';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  constructor(private store: Store) {}

  public getExportFile(): Promise<string> {
    return new Promise((resolve) => {
      this.store
        .select(selectBoardState)
        .pipe(first())
        .subscribe((state) => {
          const exportedNotes = state.nodes
            .filter((it): it is TuNode<Note> => isNote(it))
            .map((note) => {
              const user = state.users.find(
                (user) => user.id === note.content.ownerId
              );

              return {
                owner: user?.name,
                text: note.content.text,
              };
            });

          const aFileParts = [JSON.stringify(exportedNotes, null, 4)];

          resolve(
            URL.createObjectURL(
              new Blob(aFileParts, { type: 'application/octet-binary' })
            )
          );
        });
    });
  }
}
