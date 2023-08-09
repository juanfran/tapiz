import { Injectable, inject } from '@angular/core';
import { ConfigService } from './config.service';
import { from } from 'rxjs';
import { Role } from '@team-up/board-commons';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private configService = inject(ConfigService);
  private trpc = this.configService.getTrpcConfig();

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

  public login() {
    return from(this.trpc.user.login.query());
  }
}
