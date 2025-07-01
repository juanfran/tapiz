import { Injectable, inject } from '@angular/core';
import { ConfigService } from './config.service';
import { Observable } from 'rxjs';
import { WsService } from '../modules/ws/services/ws.service';
import { UserWsEvents } from '@tapiz/board-commons/models/ws-events.model';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  #configService = inject(ConfigService);
  #wsService = inject(WsService);
  #socket!: ReturnType<WsService['getSocket']>;

  constructor() {
    if (this.#configService.config.DEMO) {
      return;
    }

    this.#socket = this.#wsService.getSocket();
  }

  subUser(): Observable<UserWsEvents> {
    return new Observable<UserWsEvents>((subscriber) => {
      if (this.#configService.config.DEMO) {
        return;
      }

      this.#socket.on('user', (data) => {
        subscriber.next(data);
      });

      return () => {
        this.#socket.off('user');
      };
    });
  }

  sub<T>(type: 'team' | 'board', id: string): Observable<T> {
    const subName = `${type}:${id}`;

    return new Observable<T>((subscriber) => {
      if (this.#configService.config.DEMO) {
        return;
      }

      this.#socket.emit('sub', {
        type,
        id,
      });

      this.#socket.on(subName, (data) => {
        subscriber.next(data);
      });

      return () => {
        this.#socket.off(subName);
      };
    });
  }
}
