import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { boardFeature } from '../../reducers/board.reducer';
import { RxFor } from '@rx-angular/template/for';
import { NodeComponent } from '../node/node.component';
import { map } from 'rxjs/operators';
import { BoardDragDirective } from '../../directives/board-drag.directive';

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
  private store = inject(Store);

  public nodes$ = this.store.select(boardFeature.selectNodes).pipe(
    map((it) => {
      return it.filter(
        (it) => !['note', 'image', 'group', 'panel', 'vector'].includes(it.type)
      );
    })
  );
}
