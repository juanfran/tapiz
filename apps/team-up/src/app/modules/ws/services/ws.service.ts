import { ConfigService } from '@/app/services/config.service';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { wsMessage, wsOpen } from '../ws.actions';

@Injectable({
  providedIn: 'root',
})
export class WsService {
  private ws!: WebSocket;
  private pool: unknown[] = [];

  constructor(private store: Store, private configService: ConfigService) {
    this.poolLoop();
  }

  public listen() {
    this.ws = new WebSocket(`${this.configService.config.WS}`);

    this.ws.addEventListener('open', () => {
      this.store.dispatch(wsOpen());
    });

    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data) as {
        [key in PropertyKey]: unknown;
      }[];

      this.store.dispatch(wsMessage({ messages: data }));

      data.forEach((message) => {
        if (message['type']) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.store.dispatch(message as any);
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public send(obj: any) {
    this.pool.push(obj);
  }

  public close() {
    this.ws.close();
  }

  private poolLoop() {
    if (this.pool.length) {
      this.ws.send(JSON.stringify(this.pool));
      this.pool = [];
    }

    setTimeout(() => {
      this.poolLoop();
    }, 1000 / 15);
  }
}
