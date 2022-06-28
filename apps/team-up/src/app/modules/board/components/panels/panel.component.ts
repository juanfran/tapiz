import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Panel } from '@team-up/board-commons';
import { selectPanels } from '../../selectors/board.selectors';

@Component({
  selector: 'team-up-panels',
  templateUrl: './panels.component.html',
  styleUrls: ['./panels.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelsComponent {
  public panels$ = this.store.select(selectPanels);

  constructor(private store: Store) {}

  public trackById(index: number, panel: Panel) {
    return panel.id;
  }
}
