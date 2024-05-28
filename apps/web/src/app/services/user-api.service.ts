import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { APIConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private apiConfigService = inject(APIConfigService);
  get trpc() {
    return this.apiConfigService.trpc();
  }

  public cancelInvitation(invitationId: string) {
    return from(this.trpc.user.cancelInvite.mutate({ inviteId: invitationId }));
  }

  public acceptInvitation(invitationId: string) {
    return from(this.trpc.user.acceptInvite.mutate({ inviteId: invitationId }));
  }

  public invites() {
    return from(this.trpc.user.invites.query());
  }

  public removeAccount() {
    return from(this.trpc.user.removeAccount.mutate());
  }

  public logout() {
    return from(this.trpc.user.logout.query());
  }
}
