import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Panel } from '@team-up/board-commons';
import { selectPanels } from '../../selectors/board.selectors';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { PanelComponent } from '../panel/panel.component';
import { NgFor, AsyncPipe } from '@angular/common';

@Component({
  selector: 'team-up-panels',
  templateUrl: './panels.component.html',
  styleUrls: ['./panels.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NgFor, PanelComponent, BoardDragDirective, AsyncPipe],
})
export class PanelsComponent {
  public panels$ = this.store.select(selectPanels);

  constructor(private store: Store) {}

  public trackById(index: number, panel: Panel) {
    return panel.id;
  }
}
