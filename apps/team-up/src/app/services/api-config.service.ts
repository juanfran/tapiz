import { inject, Injectable } from '@angular/core';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
// eslint-disable-next-line @nx/enforce-module-boundaries
import type { AppRouter } from '@team-up/api/app/trpc-type';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';
import { SubscriptionService } from './subscription.service';

@Injectable({
  providedIn: 'root',
})
export class APIConfigService {
  #configService = inject(ConfigService);
  #auth = inject(AuthService);
  #subscriptionService = inject(SubscriptionService);

  public getTrpcConfig() {
    return createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: this.#configService.config.API + '/trpc',
          fetch: async (url, options) => {
            // update api-rest-interceptor.service.ts
            const response = await fetch(url, {
              ...options,
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'correlation-id': this.#subscriptionService.correlationId,
              },
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
