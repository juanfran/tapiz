import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { CreateBoardComponent } from '../create-board/create-board.component';
import { filter } from 'rxjs';
import { HomeActions } from '../../+state/home.actions';

@Component({
  selector: 'team-up-board-list-header',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <header>
      <div class="content">
        <ng-content></ng-content>
      </div>

      @if (showCreate) {
        <button
          mat-flat-button
          (click)="createBoard()"
          color="primary">
          Create board
        </button>
      }
    </header>
  `,
  styleUrls: ['./board-list-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardListHeaderComponent {
  private dialog = inject(MatDialog);
  private store = inject(Store);

  @Input()
  public teamId?: string;

  @Input()
  public showCreate = true;

  public createBoard() {
    const dialogRef = this.dialog.open(CreateBoardComponent, {
      width: '400px',
      data: {
        teamId: this.teamId,
      },
    });
    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((newBoard) => {
        this.store.dispatch(
          HomeActions.createBoard({
            name: newBoard.name,
            teamId: newBoard.teamId ?? undefined,
          }),
        );
      });
  }
}
