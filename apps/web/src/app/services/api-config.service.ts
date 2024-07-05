import { inject, Injectable } from '@angular/core';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
// eslint-disable-next-line @nx/enforce-module-boundaries
import type { AppRouter } from '@tapiz/api/app/trpc-type';
import { ConfigService } from './config.service';
import { Store } from '@ngrx/store';
import { AppActions } from '../+state/app.actions';
import { WsService } from '../modules/ws/services/ws.service';
@Injectable({
  providedIn: 'root',
})
export class APIConfigService {
  #configService = inject(ConfigService);
  #store = inject(Store);
  #wsService = inject(WsService);
  #config = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: this.#configService.config.API_URL + '/trpc',
        fetch: async (url, options) => {
          // update api-rest-interceptor.service.ts
          const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'correlation-id': this.#wsService.correlationId,
            },
          });

          if (response.status === 401) {
            this.#store.dispatch(AppActions.unauthorized());

            return response;
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
