import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Invitation, Member, TeamMember } from '@tapiz/board-commons';
import { MembersComponent } from '../members/members.component';
import { Store } from '@ngrx/store';
import { HomeActions } from '../../+state/home.actions';
import { RxState } from '@rx-angular/state';
import { homeFeature } from '../../+state/home.feature';
import { appFeature } from '../../../../+state/app.reducer';

interface TeamMembersComponentState {
  invitations: Invitation[];
  members: TeamMember[];
  currentUserId: string;
}

@Component({
  selector: 'tapiz-team-members',
  template: `
    @if (model$ | async; as vm) {
      <tapiz-members
        title="Team members"
        [invitations]="vm.invitations"
        [members]="vm.members"
        (invited)="onInvited($event)"
        (deletedInvitation)="onDeleteInvitation($event)"
        (deletedMember)="onDeleteMember($event)"
        (roleInvitationChanged)="onRoleInvitationChanged($event)"
        (roleMemberChanged)="onRoleMemberChanged($event)"
        (closeDialog)="onCloseDialog()"></tapiz-members>
    }
  `,
  styleUrls: ['./team-members.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  imports: [CommonModule, MembersComponent],
})
export class TeamMembersComponent {
  public data = inject<{
    teamId: string;
    title: string;
  }>(MAT_DIALOG_DATA);
  public dialogRef = inject(MatDialogRef);
  public store = inject(Store);
  public state = inject(RxState) as RxState<TeamMembersComponentState>;
  public model$ = this.state.select();

  constructor() {
    this.store.dispatch(
      HomeActions.initTeamMembersModal({ teamId: this.data.teamId }),
    );

    this.state.connect(
      'invitations',
      this.store.select(homeFeature.selectInvitations),
    );

    this.state.connect('members', this.store.select(homeFeature.selectMembers));
    this.state.connect(
      'currentUserId',
      this.store.select(appFeature.selectUserId),
    );
  }

  public onCloseDialog() {
    this.dialogRef.close();
  }

  public onDeleteInvitation(invitationId: string) {
    this.store.dispatch(HomeActions.deleteTeamInvitation({ id: invitationId }));
  }

  public onDeleteMember(memberId: string) {
    this.store.dispatch(
      HomeActions.deleteTeamMember({ id: memberId, teamId: this.data.teamId }),
    );

    if (this.state.get('currentUserId') === memberId) {
      this.onCloseDialog();
    }
  }

  public onRoleInvitationChanged(invitation: {
    id: string;
    role: Member['role'];
  }) {
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

  public onRoleMemberChanged(member: { id: string; role: Member['role'] }) {
    const role = member.role;

    if (role !== 'guest') {
      this.store.dispatch(
        HomeActions.changeRole({
          teamId: this.data.teamId,
          memberId: member.id,
          role,
        }),
      );

      if (this.state.get('currentUserId') === member.id) {
        this.onCloseDialog();
      }
    }
  }

  public onInvited(
    invitations: Required<Pick<Invitation, 'email' | 'role'>>[],
  ) {
    invitations.forEach((invitation) => {
      const role = invitation.role;

      if (role !== 'guest') {
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
