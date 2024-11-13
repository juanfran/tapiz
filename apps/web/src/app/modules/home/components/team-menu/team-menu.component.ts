import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import type { UserTeam } from '@tapiz/board-commons';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HomeActions } from '../../+state/home.actions';
import { TeamMembersComponent } from '../team-members/team-members.component';
import { RenameTeamComponent } from '../rename-team/rename-team.component';
import { MatButtonModule } from '@angular/material/button';
import { ConfirmComponent } from '../../../../shared/confirm-action/confirm-actions.component';
import { input } from '@angular/core';
import { SpaceFormComponent } from '../space-form/space-form.component';
import { homeFeature } from '../../+state/home.feature';

@Component({
  selector: 'tapiz-team-menu',
  styleUrls: ['./team-menu.component.scss'],
  standalone: true,
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
      @if (team().teamMember.role !== 'admin') {
        <button
          (click)="leaveTeam()"
          mat-menu-item>
          <mat-icon>logout</mat-icon>
          <span>Leave</span>
        </button>
      }
      <button
        mat-menu-item
        (click)="space()">
        <mat-icon>group_work</mat-icon>
        <span>Create space</span>
      </button>
      @if (team().teamMember.role === 'admin') {
        <button
          mat-menu-item
          (click)="rename()">
          <mat-icon>edit</mat-icon>
          <span>Rename</span>
        </button>
        <button
          mat-menu-item
          (click)="openMembers()">
          <mat-icon>person_add</mat-icon>
          <span>Members</span>
        </button>
        <button
          mat-menu-item
          (click)="deleteTeam()">
          <mat-icon>delete</mat-icon>
          <span>Delete</span>
        </button>
      }
    </mat-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamMenuComponent {
  team = input.required<UserTeam>();

  #store = inject(Store);
  #dialog = inject(MatDialog);
  #boards = this.#store.selectSignal(homeFeature.selectBoards);

  deleteTeam() {
    const dialogRef = this.#dialog.open(ConfirmComponent, {
      data: {
        title: 'Delete team?',
        description:
          'All boards and data will be deleted. This action cannot be undone.',
        confirm: {
          text: 'Delete team',
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
        this.#store.dispatch(HomeActions.deleteTeam({ id: this.team().id }));
      });
  }

  rename() {
    const dialogRef = this.#dialog.open(RenameTeamComponent, {
      width: '400px',
      autoFocus: 'dialog',
      data: {
        name: this.team().name,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((name) => {
        this.#store.dispatch(
          HomeActions.renameTeam({
            id: this.team().id,
            name,
          }),
        );
      });
  }

  openMembers() {
    this.#dialog.open(TeamMembersComponent, {
      width: '970px',
      autoFocus: 'dialog',
      data: {
        title: 'Team members',
        teamId: this.team().id,
      },
    });
  }

  space() {
    const dialogRef = this.#dialog.open(SpaceFormComponent, {
      width: '400px',
      autoFocus: 'dialog',
      data: {
        boards: this.#boards(),
      },
    });

    dialogRef
      .afterClosed()
      .pipe(filter((it) => it))
      .subscribe((result) => {
        console.log(result);

        this.#store.dispatch(
          HomeActions.createSpace({
            teamId: this.team().id,
            name: result.name,
            boards: result.boards,
          }),
        );
      });
  }

  leaveTeam() {
    const dialogRef = this.#dialog.open(ConfirmComponent, {
      data: {
        title: 'Are you sure?',
        confirm: {
          text: 'Leave team',
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
        this.#store.dispatch(HomeActions.leaveTeam({ id: this.team().id }));
      });
  }
}
