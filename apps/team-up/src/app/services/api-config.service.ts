import { inject, Injectable } from '@angular/core';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
// eslint-disable-next-line @nx/enforce-module-boundaries
import type { AppRouter } from '@team-up/api/app/trpc-type';
import { ConfigService } from './config.service';
import { SubscriptionService } from './subscription.service';
import { Store } from '@ngrx/store';
import { AppActions } from '../+state/app.actions';
@Injectable({
  providedIn: 'root',
})
export class APIConfigService {
  #configService = inject(ConfigService);
  #store = inject(Store);
  #subscriptionService = inject(SubscriptionService);
  #config = createTRPCProxyClient<AppRouter>({
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
            this.#store.dispatch(AppActions.logout());

            return Promise.reject('Unauthorized');
          }

          return response;
        },
      }),
    ],
  });

  public trpc() {
    return this.#config;
  }
}
