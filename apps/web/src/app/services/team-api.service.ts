import { Injectable, inject } from '@angular/core';
import { APIConfigService } from './api-config.service';
import { Observable, from } from 'rxjs';
import { Invitation, TeamInvitation } from '@tapiz/board-commons';

@Injectable({
  providedIn: 'root',
})
export class TeamApiService {
  private apiConfigService = inject(APIConfigService);

  get trpc() {
    return this.apiConfigService.trpc();
  }

  public fetchTeams() {
    return from(this.trpc.team.getAll.query());
  }

  public createTeam(name: string) {
    return from(this.trpc.team.new.mutate({ name }));
  }

  public deleteTeam(teamId: string) {
    return from(this.trpc.team.delete.mutate({ teamId }));
  }

  public inviteToTeam(
    teamId: string,
    email: string,
    role: 'admin' | 'member',
  ): Observable<Invitation> {
    return from(this.trpc.team.invite.mutate({ teamId, email, role }));
  }

  public teamInvitations(teamId: string): Observable<TeamInvitation[]> {
    return from(this.trpc.team.invitations.query({ teamId }));
  }

  public teamMembers(teamId: string) {
    return from(this.trpc.team.members.query({ teamId }));
  }

  public leaveTeam(teamId: string) {
    return from(this.trpc.team.leave.mutate({ teamId }));
  }

  public renameTeam(teamId: string, name: string) {
    return from(this.trpc.team.rename.mutate({ teamId, name }));
  }

  public deleteMember(teamId: string, memberId: string) {
    return from(this.trpc.team.deleteMember.mutate({ memberId, teamId }));
  }

  public changeRole(teamId: string, userId: string, role: 'admin' | 'member') {
    return from(this.trpc.team.changeRole.mutate({ userId, teamId, role }));
  }

  public changeInvitationRole(invitationId: string, role: 'member' | 'admin') {
    return from(
      this.trpc.team.editInviteRole.mutate({
        inviteId: invitationId,
        role,
      }),
    );
  }
}
