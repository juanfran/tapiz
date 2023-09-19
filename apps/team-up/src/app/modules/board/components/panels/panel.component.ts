import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Panel, TuNode, isPanel } from '@team-up/board-commons';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { PanelComponent } from '../panel/panel.component';
import { NgFor, AsyncPipe } from '@angular/common';
import { ResizableDirective } from '../../directives/resize.directive';
import { boardFeature } from '../../reducers/board.reducer';
import { map } from 'rxjs';

@Component({
  selector: 'team-up-panels',
  templateUrl: './panels.component.html',
  styleUrls: ['./panels.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgFor,
    PanelComponent,
    BoardDragDirective,
    AsyncPipe,
    ResizableDirective,
  ],
})
export class PanelsComponent {
  public panels$ = this.store
    .select(boardFeature.selectNodes)
    .pipe(map((nodes) => nodes.filter(isPanel)));

  constructor(private store: Store) {}

  public trackById(index: number, panel: TuNode<Panel>) {
    return panel.id;
  }
}
