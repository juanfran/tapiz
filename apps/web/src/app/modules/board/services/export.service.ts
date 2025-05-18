import { Injectable, inject } from '@angular/core';
import {
  Group,
  Note,
  Panel,
  TNode,
  UserNode,
  isNote,
} from '@tapiz/board-commons';
import { BoardFacade } from '../../../services/board-facade.service';
import { insideNode } from '@tapiz/cdk/utils/inside-node';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private boardFacade = inject(BoardFacade);

  public getExportFile(): Promise<string> {
    return new Promise((resolve) => {
      const nodes = this.boardFacade.get();
      const users = nodes.filter((it): it is UserNode => it.type === 'user');
      const panels = nodes.filter(
        (it): it is TNode<Panel> => it.type === 'panel',
      );
      const groups = nodes.filter(
        (it): it is TNode<Group> => it.type === 'group',
      );

      const exportedNotes = nodes
        .filter((it): it is TNode<Note> => isNote(it))
        .map((note) => {
          const user = users.find((user) => user.id === note.content.ownerId);

          const node = {
            owner: user?.content.name,
            text: note.content.text,
            votes: note.content.votes.map((vote) => {
              const user = users.find((user) => user.id === vote.userId);

              return {
                name: user?.content.name,
                value: vote.vote,
              };
            }),
            panel: insideNode<Panel>(note.content, panels)?.content?.text,
            group: insideNode<Group>(note.content, groups)?.content?.title,
            comments: note.children?.filter(
              (child) => child.type === 'comment',
            ),
          };

          return node;
        })
        .toSorted((a, b) => {
          const panelAname = a.panel ?? '';
          const panelBname = b.panel ?? '';

          if (panelAname > panelBname) {
            return -1;
          }

          if (panelBname > panelAname) {
            return 1;
          }

          return 0;
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
