import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Panel, TuNode, isPanel } from '@team-up/board-commons';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { PanelComponent } from '../panel/panel.component';
import { NgFor, AsyncPipe } from '@angular/common';
import { map } from 'rxjs';
import { BoardFacade } from '@/app/services/board-facade.service';

@Component({
  selector: 'team-up-panels',
  templateUrl: './panels.component.html',
  styleUrls: ['./panels.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NgFor, PanelComponent, BoardDragDirective, AsyncPipe],
})
export class PanelsComponent {
  private boardFacade = inject(BoardFacade);

  public panels$ = this.boardFacade
    .getNodes()
    .pipe(map((nodes) => nodes.filter(isPanel)));

  public trackById(index: number, panel: TuNode<Panel>) {
    return panel.id;
  }
}
