import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectCursors } from '../../selectors/board.selectors';

@Component({
  selector: 'team-up-cursors',
  templateUrl: './cursors.component.html',
  styleUrls: ['./cursors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursorsComponent {
  public users$ = this.store.select(selectCursors());

  constructor(private store: Store) {}
}
