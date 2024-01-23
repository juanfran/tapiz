import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { BoardFacade } from '../../../../services/board-facade.service';

@Component({
  selector: 'team-up-cursors',
  templateUrl: './cursors.component.html',
  styleUrls: ['./cursors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NgFor, NgIf, AsyncPipe],
})
export class CursorsComponent {
  private boardFacade = inject(BoardFacade);
  public users$ = this.boardFacade.selectCursors();
}
