import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RxFor } from '@rx-angular/template/for';
import { NodeComponent } from '../node/node.component';
import { map } from 'rxjs/operators';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { BoardFacade } from '@/app/services/board-facade.service';

@Component({
  selector: 'team-up-nodes',
  styleUrls: ['./nodes.component.scss'],
  template: ` <team-up-node
    *rxFor="let node of nodes$; trackBy: 'id'"
    teamUpBoardDrag
    [node]="node" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RxFor, NodeComponent, BoardDragDirective],
  providers: [],
})
export class NodesComponent {
  private boardFacade = inject(BoardFacade);

  public nodes$ = this.boardFacade.getNodes().pipe(
    map((it) => {
      return it.filter(
        (it) =>
          !['note', 'image', 'group', 'panel', 'vector', 'user'].includes(
            it.type
          )
      );
    })
  );
}
