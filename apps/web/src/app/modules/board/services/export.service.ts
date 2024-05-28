import { Injectable, inject } from '@angular/core';
import { Note, TuNode, UserNode, isNote } from '@tapiz/board-commons';
import { BoardFacade } from '../../../services/board-facade.service';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private boardFacade = inject(BoardFacade);

  public getExportFile(): Promise<string> {
    return new Promise((resolve) => {
      const nodes = this.boardFacade.get();
      const users = nodes.filter((it): it is UserNode => it.type === 'user');

      const exportedNotes = nodes
        .filter((it): it is TuNode<Note> => isNote(it))
        .map((note) => {
          const user = users.find((user) => user.id === note.content.ownerId);

          return {
            owner: user?.content.name,
            text: note.content.text,
          };
        });

      const aFileParts = [JSON.stringify(exportedNotes, null, 4)];

      resolve(
        URL.createObjectURL(
          new Blob(aFileParts, { type: 'application/octet-binary' }),
        ),
      );
    });
  }
}
