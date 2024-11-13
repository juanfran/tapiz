import { Injectable, inject } from '@angular/core';
import { APIConfigService } from './api-config.service';
import { Observable, from } from 'rxjs';
import { Invitation, TeamInvitation } from '@tapiz/board-commons';

@Injectable({
  providedIn: 'root',
})
export class TeamApiService {
  #apiConfigService = inject(APIConfigService);

  get trpc() {
    return this.#apiConfigService.trpc();
  }

  fetchTeams() {
    return from(this.trpc.team.getAll.query());
  }

  createTeam(name: string) {
    return from(this.trpc.team.new.mutate({ name }));
  }

  deleteTeam(teamId: string) {
    return from(this.trpc.team.delete.mutate({ teamId }));
  }

  inviteToTeam(
    teamId: string,
    email: string,
    role: 'admin' | 'member',
  ): Observable<Invitation> {
    return from(this.trpc.team.invite.mutate({ teamId, email, role }));
  }

  teamInvitations(teamId: string): Observable<TeamInvitation[]> {
    return from(this.trpc.team.invitations.query({ teamId }));
  }

  teamMembers(teamId: string) {
    return from(this.trpc.team.members.query({ teamId }));
  }

  leaveTeam(teamId: string) {
    return from(this.trpc.team.leave.mutate({ teamId }));
  }

  renameTeam(teamId: string, name: string) {
    return from(this.trpc.team.rename.mutate({ teamId, name }));
  }

  deleteMember(teamId: string, memberId: string) {
    return from(this.trpc.team.deleteMember.mutate({ memberId, teamId }));
  }

  changeRole(teamId: string, userId: string, role: 'admin' | 'member') {
    return from(this.trpc.team.changeRole.mutate({ userId, teamId, role }));
  }

  changeInvitationRole(invitationId: string, role: 'member' | 'admin') {
    return from(
      this.trpc.team.editInviteRole.mutate({
        inviteId: invitationId,
        role,
      }),
    );
  }

  spaces(teamId: string) {
    return from(this.trpc.team.spaces.query({ teamId }));
  }

  createSpace(teamId: string, name: string, boards: string[]) {
    return from(this.trpc.team.createSpace.mutate({ teamId, name, boards }));
  }

  updateSpace(spaceId: string, name: string, boards: string[]) {
    return from(this.trpc.team.updateSpace.mutate({ spaceId, name, boards }));
  }

  deleteSpace(spaceId: string) {
    return from(this.trpc.team.deleteSpace.mutate({ spaceId }));
  }
}
