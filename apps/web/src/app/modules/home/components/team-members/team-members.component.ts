import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Invitation, Member } from '@tapiz/board-commons';
import { MembersComponent } from '../members/members.component';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { homeFeature } from '../../+state/home.feature';
import { appFeature } from '../../../../+state/app.reducer';

@Component({
  selector: 'tapiz-team-members',
  template: `
    <tapiz-members
      title="Team members"
      [invitations]="invitations()"
      [members]="members()"
      (invited)="onInvited($event)"
      (deletedInvitation)="onDeleteInvitation($event)"
      (deletedMember)="onDeleteMember($event)"
      (roleInvitationChanged)="onRoleInvitationChanged($event)"
      (roleMemberChanged)="onRoleMemberChanged($event)"
      (closeDialog)="onCloseDialog()"></tapiz-members>
  `,
  styleUrls: ['./team-members.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MembersComponent],
})
export class TeamMembersComponent {
  data = inject<{
    teamId: string;
    title: string;
  }>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
  store = inject(Store);

  invitations = this.store.selectSignal(homeFeature.selectInvitations);
  members = this.store.selectSignal(homeFeature.selectMembers);
  currentUserId = this.store.selectSignal(appFeature.selectUserId);

  constructor() {
    this.store.dispatch(
      HomeActions.initTeamMembersModal({ teamId: this.data.teamId }),
    );
  }

  onCloseDialog() {
    this.dialogRef.close();
  }

  onDeleteInvitation(invitationId: string) {
    this.store.dispatch(HomeActions.deleteTeamInvitation({ id: invitationId }));
  }

  onDeleteMember(memberId: string) {
    this.store.dispatch(
      HomeActions.deleteTeamMember({ id: memberId, teamId: this.data.teamId }),
    );

    if (this.currentUserId() === memberId) {
      this.onCloseDialog();
    }
  }

  onRoleInvitationChanged(invitation: { id: string; role: Member['role'] }) {
    const role = invitation.role;

    if (role !== 'guest') {
      this.store.dispatch(
        HomeActions.changeInvitationRole({
          id: invitation.id,
          role,
        }),
      );
    }
  }

  onRoleMemberChanged(member: { id: string; role: Member['role'] }) {
    const role = member.role;

    if (role !== 'guest') {
      this.store.dispatch(
        HomeActions.changeRole({
          teamId: this.data.teamId,
          memberId: member.id,
          role,
        }),
      );

      if (this.currentUserId() === member.id) {
        this.onCloseDialog();
      }
    }
  }

  onInvited(invitations: Required<Pick<Invitation, 'email' | 'role'>>[]) {
    invitations.forEach((invitation) => {
      const role = invitation.role;

      if (role !== 'guest' && invitation.email) {
        this.store.dispatch(
          HomeActions.inviteToTeam({
            id: this.data.teamId,
            invitation: {
              email: invitation.email,
              role,
            },
          }),
        );
      }
    });
  }
}
