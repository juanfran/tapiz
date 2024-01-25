import { inject, Injectable } from '@angular/core';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { AppRouter } from '@team-up/api/app/init-server';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class APIConfigService {
  #configService = inject(ConfigService);
  #auth = inject(AuthService);

  public getTrpcConfig() {
    return createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: this.#configService.config.API + '/trpc',
          fetch: async (url, options) => {
            const response = await fetch(url, {
              ...options,
              credentials: 'include',
            });

            if (response.status === 401) {
              this.#auth.logout();
              return Promise.reject('Unauthorized');
            }

            return response;
          },
        }),
      ],
    });
  }
}
