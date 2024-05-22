import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { wsOpen } from '../ws.actions';
import { optimize } from '@team-up/board-commons';
import { Router } from '@angular/router';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ConfigService } from '../../../services/config.service';

@Injectable({
  providedIn: 'root',
})
export class WsService {
  #store = inject(Store);
  #configService = inject(ConfigService);
  #ws?: WebSocket;
  #pool: unknown[] = [];
  #notificationService = inject(NotificationService);
  #router = inject(Router);
  constructor() {
    this.#poolLoop();
  }

  listen() {
    if (this.#configService.config.DEMO) {
      return;
    }

    this.#ws = new WebSocket(`${this.#configService.config.WS_URL}/events`);

    this.#ws.addEventListener('open', () => {
      this.#store.dispatch(wsOpen());
    });

    this.#ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data) as {
        [key in PropertyKey]: unknown;
      }[];

      data.forEach((message) => {
        if (message['type']) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.#store.dispatch(message as any);
        }
      });
    });

    this.#ws.addEventListener('close', (e) => {
      if (e.code === 1008) {
        this.#notificationService.open({
          message: 'Unauthorized',
          action: 'Close',
          type: 'error',
        });

        this.#router.navigate(['/']);
      } else if (e.code !== 1000 && e.code !== 1001) {
        this.#notificationService.open({
          message: 'Connection lost',
          action: 'Close',
          type: 'error',
          durantion: 3000,
        });

        this.#router.navigate(['/']);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(obj: unknown[]) {
    this.#pool.push(...obj);
  }

  close() {
    this.#ws?.close(1000);
  }

  #poolLoop() {
    if (this.#pool.length) {
      const optimizedPool = optimize(this.#pool);
      if (this.#ws?.readyState === 1) {
        this.#ws.send(JSON.stringify(optimizedPool));
      }
      this.#pool = [];
    }

    setTimeout(() => {
      this.#poolLoop();
    }, 1000 / 15);
  }
}
