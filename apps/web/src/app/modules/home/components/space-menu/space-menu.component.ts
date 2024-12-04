import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import type { BoardUser, Space } from '@tapiz/board-commons';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HomeActions } from '../../+state/home.actions';
import { MatButtonModule } from '@angular/material/button';
import { ConfirmComponent } from '../../../../shared/confirm-action/confirm-actions.component';
import { input } from '@angular/core';
import { SpaceFormComponent } from '../space-form/space-form.component';
@Component({
  selector: 'tapiz-space-menu',
  styleUrls: ['./space-menu.component.css'],
  imports: [MatIconModule, MatMenuModule, MatDialogModule, MatButtonModule],
  template: `
    <button
      tuIconButton
      [matMenuTriggerFor]="menu"
      color="primary"
      aria-label="Teams settings">
      <mat-icon>more_vert </mat-icon>
    </button>
    <mat-menu #menu="matMenu">
      <button
        mat-menu-item
        (click)="edit()">
        <mat-icon>edit</mat-icon>
        <span>Update</span>
      </button>
      <button
        mat-menu-item
        (click)="deleteTeam()">
        <mat-icon>delete</mat-icon>
        <span>Delete</span>
      </button>
    </mat-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceMenuComponent {
  #store = inject(Store);
  #dialog = inject(MatDialog);
  space = input.required<Space>();
  boards = input.required<BoardUser[]>();

  deleteTeam() {
    const dialogRef = this.#dialog.open(ConfirmComponent, {
      data: {
        title: 'Delete space?',
        description:
          'This will delete only the space, boards inside will not be deleted.',
        confirm: {
          text: 'Delete space',
          color: 'warn',
        },
        cancel: {
          text: 'Cancel',
          color: 'basic',
        },
        align: 'end',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe(() => {
        this.#store.dispatch(
          HomeActions.deleteSpace({ spaceId: this.space().id }),
        );
      });
  }

  edit() {
    const dialogRef = this.#dialog.open(SpaceFormComponent, {
      width: '400px',
      autoFocus: 'dialog',
      data: {
        space: this.space(),
        teamId: this.space().teamId,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((newData: { name: string; boards: string[] }) => {
        this.#store.dispatch(
          HomeActions.updateSpace({
            spaceId: this.space().id,
            ...newData,
          }),
        );
      });
  }
}
