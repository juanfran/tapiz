import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CreateBoardComponent } from '../create-board/create-board.component';
import { filter } from 'rxjs';

@Component({
  selector: 'tapiz-empty-boards',
  styleUrls: ['./empty-boards.component.css'],
  template: `
    <h1>No boards</h1>
    <button
      mat-flat-button
      color="primary"
      (click)="createBoard()">
      Create your first board
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [MatButtonModule],
})
export class EmptyBoardsComponent {
  #store = inject(Store);
  #dialog = inject(MatDialog);

  teamId = input<string>();

  createBoard() {
    const dialogRef = this.#dialog.open(CreateBoardComponent, {
      width: '400px',
      data: {
        teamId: this.teamId(),
      },
    });
    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((newBoard) => {
        this.#store.dispatch(
          HomeActions.createBoard({
            name: newBoard.name,
            teamId: newBoard.teamId ?? undefined,
          }),
        );
      });
  }
}
