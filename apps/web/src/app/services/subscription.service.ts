import { Injectable, inject } from '@angular/core';
import { ConfigService } from './config.service';
import { BehaviorSubject, Subject, debounceTime, filter, map } from 'rxjs';
import { isDeepEqual } from 'remeda';
import { WsService } from '../modules/ws/services/ws.service';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  #configService = inject(ConfigService);
  #wsService = inject(WsService);
  #boardIds = new BehaviorSubject<string[]>([]);
  #boardsSubject = new Subject<string>();
  #teamIds = new BehaviorSubject<string[]>([]);
  #teamSubject = new Subject<string>();
  #userSubject = new Subject<void>();

  constructor() {
    if (this.#configService.config.DEMO) {
      return;
    }

    const socket = this.#wsService.getSocket();

    this.#boardIds
      .pipe(
        debounceTime(100),
        map((ids, index) => {
          return {
            ids,
            index,
          };
        }),
        filter((it) => {
          return it.ids.length > 0 || it.index > 0;
        }),
      )
      .subscribe(({ ids }) => {
        socket.emit('sub', {
          type: 'board',
          ids,
        });
      });

    this.#teamIds
      .pipe(
        map((ids, index) => {
          return {
            ids,
            index,
          };
        }),
        filter((it) => {
          return it.ids.length > 0 || it.index > 0;
        }),
      )
      .subscribe(({ ids }) => {
        socket.emit('sub', {
          type: 'team',
          ids,
        });
      });

    socket.on('sub:refresh:board', (id: string) => {
      this.#boardsSubject.next(id);
    });

    socket.on('sub:refresh:team', (id: string) => {
      this.#teamSubject.next(id);
    });

    socket.on('sub:refresh:user', () => {
      this.#userSubject.next();
    });
  }

  boardMessages() {
    return this.#boardsSubject.asObservable();
  }

  teamMessages() {
    return this.#teamSubject.asObservable();
  }

  userMessages() {
    return this.#userSubject.asObservable();
  }

  watchBoardIds(ids: string[]) {
    if (!isDeepEqual(ids, this.#boardIds.getValue())) {
      this.#boardIds.next(ids);
    }

    return this.boardMessages();
  }

  watchTeamIds(ids: string[]) {
    const currentIds = this.#teamIds.getValue();

    if (!isDeepEqual(ids, currentIds)) {
      this.#teamIds.next(ids);
    }

    return this.teamMessages();
  }
}
