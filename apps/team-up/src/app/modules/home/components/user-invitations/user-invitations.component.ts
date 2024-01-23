import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { UserInvitation } from '@team-up/board-commons';
import { HomeActions } from '../../+state/home.actions';
import { trackByProp } from '../../../../shared/track-by-prop';

@Component({
  selector: 'team-up-user-invitations',
  template: `
    <h1 class="title">
      Invitations
      <button
        type="button"
        [mat-dialog-close]="true">
        <mat-icon>close</mat-icon>
      </button>
    </h1>

    <div class="invitations">
      <div
        class="invitation"
        *ngFor="let invitation of data.invitations; trackBy: trackByUserId">
        <div
          class="invitation-info"
          *ngIf="invitation.team">
          <div class="invitation-title">Team: {{ invitation.team.name }}</div>
        </div>
        <div class="invitation-actions">
          <button
            mat-icon-button
            color="primary"
            (click)="acceptInvitation(invitation)">
            <mat-icon>check</mat-icon>
          </button>
          <button
            mat-icon-button
            color="warn"
            (click)="rejectInvitation(invitation)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./user-invitations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, MatButtonModule],
})
export class UserInvitationsComponent {
  public dialogRef = inject(MatDialogRef);
  public store = inject(Store);

  public trackByUserId = trackByProp<UserInvitation>('id');

  public data = inject<{
    invitations: UserInvitation[];
  }>(MAT_DIALOG_DATA);

  public acceptInvitation(invitation: UserInvitation) {
    this.dialogRef.close(invitation);

    this.store.dispatch(HomeActions.acceptInvitation({ invitation }));
  }

  public rejectInvitation(invitation: UserInvitation) {
    this.dialogRef.close(invitation);

    this.store.dispatch(HomeActions.rejectInvitation({ invitation }));
  }
}
