import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  Group,
  Note,
  Panel,
  TuNode,
  UserNode,
  isNote,
} from '@tapiz/board-commons';
import { BoardFacade } from '../../../services/board-facade.service';
import { insideNode } from '@tapiz/cdk/utils/inside-node';
import { boardPageFeature } from '../reducers/boardPage.reducer';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private boardFacade = inject(BoardFacade);
  private store = inject(Store);

  public getExportFile(): Promise<string> {
    return new Promise((resolve) => {
      const nodes = this.boardFacade.get();
      const users = nodes.filter((it): it is UserNode => it.type === 'user');
      const panels = nodes.filter(
        (it): it is TuNode<Panel> => it.type === 'panel',
      );
      const groups = nodes.filter(
        (it): it is TuNode<Group> => it.type === 'group',
      );

      const exportedNotes = nodes
        .filter((it): it is TuNode<Note> => isNote(it))
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

  public getFullJsonExport(): string {
    const nodes = this.boardFacade.get().filter((node) => node.type !== 'user');
    return JSON.stringify(nodes, null, 2);
  }

  public async exportAsPng(): Promise<void> {
    const workLayer = document.querySelector('.work-layer') as HTMLElement;
    if (!workLayer) return;

    const nodes = this.boardFacade.get().filter((n) => {
      if (n.type === 'user') return false;
      const c = n.content as Record<string, unknown>;
      return c?.['position'] != null;
    });
    if (!nodes.length) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const node of nodes) {
      const c = node.content as Record<string, unknown>;
      const pos = c['position'] as { x: number; y: number };
      const w = (c['width'] as number) || 300;
      const h = (c['height'] as number) || 300;
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x + w > maxX) maxX = pos.x + w;
      if (pos.y + h > maxY) maxY = pos.y + h;
    }

    const padding = 50;
    minX -= padding;
    minY -= padding;
    const width = maxX - minX + padding;
    const height = maxY - minY + padding;

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--board-bg')
        .trim() || '#f8f7f3';
    ctx.fillRect(0, 0, width, height);

    const nodeElements = workLayer.querySelectorAll('tapiz-node');
    for (const el of Array.from(nodeElements)) {
      const htmlEl = el as HTMLElement;
      const transform = htmlEl.style.transform;
      const match = transform.match(
        /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/,
      );
      if (!match) continue;

      const x = parseFloat(match[1]) - minX;
      const y = parseFloat(match[2]) - minY;
      const w = htmlEl.offsetWidth;
      const h = htmlEl.offsetHeight;

      const bg =
        getComputedStyle(htmlEl.firstElementChild as Element).backgroundColor ||
        '#fff9c4';
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 12);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const boardId = this.store.selectSignal(boardPageFeature.selectBoardId)();
      link.href = url;
      link.download = `${boardId}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
