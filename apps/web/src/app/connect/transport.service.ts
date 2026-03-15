import { Injectable, inject } from '@angular/core';
import { createConnectTransport } from '@connectrpc/connect-web';
import { ConfigService } from '../services/config.service';

@Injectable({ providedIn: 'root' })
export class ConnectTransportService {
  readonly #config = inject(ConfigService);

  readonly transport = createConnectTransport({
    baseUrl: this.#config.config.API_URL + '/connect',
    credentials: 'include',
  });
}
