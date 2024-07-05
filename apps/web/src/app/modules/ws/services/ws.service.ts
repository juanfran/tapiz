import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { wsOpen } from '../ws.actions';
import { optimize } from '@tapiz/board-commons';
import { Router } from '@angular/router';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ConfigService } from '../../../services/config.service';

import { io } from 'socket.io-client';
import { v4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class WsService {
  #store = inject(Store);
  #configService = inject(ConfigService);
  #pool: unknown[] = [];
  #notificationService = inject(NotificationService);
  #router = inject(Router);
  #socket = io(this.#configService.config.WS_URL, {
    autoConnect: false,
    withCredentials: true,
  });
  correlationId = v4();

  constructor() {
    this.#poolLoop();
  }

  getSocket() {
    return this.#socket;
  }

  listen() {
    if (this.#configService.config.DEMO) {
      return;
    }

    this.#socket.connect();

    this.#socket.on('connect', () => {
      this.#store.dispatch(wsOpen());
      this.#socket.emit('correlationId', this.correlationId);
    });

    this.#socket.on('disconnect', (reason) => {
      if (reason.includes('client')) {
        return;
      }

      this.#notificationService.open({
        message: 'Connection lost',
        action: 'Close',
        type: 'error',
        durantion: 3000,
      });

      this.#router.navigate(['/']);
    });

    this.#socket.on(
      'board',
      (
        response: {
          [key in PropertyKey]: unknown;
        }[],
      ) => {
        response.forEach((message) => {
          if (message['type']) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.#store.dispatch(message as any);
          }
        });
      },
    );

    this.#socket.on('error', (type: string) => {
      if (type === 'unauthorized') {
        this.#notificationService.open({
          message: 'Unauthorized',
          action: 'Close',
          type: 'error',
        });

        this.#router.navigate(['/']);
      }
    });
  }

  send(obj: unknown[]) {
    this.#pool.push(...obj);
  }

  close() {
    this.#socket.close();
  }

  #poolLoop() {
    if (this.#pool.length) {
      const optimizedPool = optimize(this.#pool);
      if (this.#socket.connected) {
        this.#socket.emit('board', optimizedPool);
      }
      this.#pool = [];
    }

    setTimeout(() => {
      this.#poolLoop();
    }, 1000 / 15);
  }
}
