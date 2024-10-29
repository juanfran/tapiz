import { Injectable, inject } from '@angular/core';
import { from } from 'rxjs';
import { APIConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  #apiConfigService = inject(APIConfigService);
  get trpc() {
    return this.#apiConfigService.trpc();
  }

  cancelInvitation(invitationId: string) {
    return from(this.trpc.user.cancelInvite.mutate({ inviteId: invitationId }));
  }

  acceptInvitation(invitationId: string) {
    return from(this.trpc.user.acceptInvite.mutate({ inviteId: invitationId }));
  }

  invites() {
    return from(this.trpc.user.invites.query());
  }

  removeAccount() {
    return from(this.trpc.user.removeAccount.mutate());
  }

  user() {
    return from(this.trpc.user.user.query());
  }

  notifications(offset = 0) {
    return from(this.trpc.user.notifications.query({ offset }));
  }

  clearNotifications() {
    return from(this.trpc.user.clearNotifications.mutate());
  }

  logout() {
    return from(this.trpc.user.logout.query());
  }
}
