import { ConfigService } from '@/app/services/config.service';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { wsOpen } from '../ws.actions';
import { optimize } from '@team-up/board-commons';

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

      data.forEach((message) => {
        if (message['type']) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.store.dispatch(message as any);
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public send(obj: unknown[]) {
    this.pool.push(...obj);
  }

  public close() {
    this.ws.close();
  }

  private poolLoop() {
    if (this.pool.length) {
      const optimizedPool = optimize(this.pool);
      this.ws.send(JSON.stringify(optimizedPool));
      this.pool = [];
    }

    setTimeout(() => {
      this.poolLoop();
    }, 1000 / 15);
  }
}
