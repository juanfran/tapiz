import { Injectable, inject } from '@angular/core';
import { ConfigService } from './config.service';
import { BehaviorSubject, Subject, filter, map } from 'rxjs';
import { v4 } from 'uuid';
import { equals } from 'remeda';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  #ws?: WebSocket;
  #configService = inject(ConfigService);
  #boardIds = new BehaviorSubject<string[]>([]);
  #boardsSubject = new Subject<string>();
  #teamIds = new BehaviorSubject<string[]>([]);
  #teamSubject = new Subject<string>();
  #userSubject = new Subject<void>();
  correlationId = v4();

  public listen() {
    if (this.#configService.config.DEMO) {
      return;
    }

    this.#ws = new WebSocket(`${this.#configService.config.WS}/sub`);

    this.#ws.addEventListener('open', () => {
      this.#boardIds
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
          if (!this.#ws) {
            return;
          }

          this.#ws.send(
            JSON.stringify({
              type: 'board',
              ids,
              clientId: this.correlationId,
            }),
          );
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
          if (!this.#ws) {
            return;
          }

          this.#ws.send(
            JSON.stringify({ type: 'team', ids, clientId: this.correlationId }),
          );
        });
    });

    this.#ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message['type'] === 'team') {
          this.#teamSubject.next(message['id']);
        } else if (message['type'] === 'board') {
          this.#boardsSubject.next(message['id']);
        } else if (message['type'] === 'user') {
          this.#userSubject.next();
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  close() {
    this.#ws?.close();
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
    if (!equals(ids, this.#boardIds.getValue())) {
      this.#boardIds.next(ids);
    }

    return this.boardMessages();
  }

  watchTeamIds(ids: string[]) {
    const currentIds = this.#teamIds.getValue();

    if (!equals(ids, currentIds)) {
      this.#teamIds.next(ids);
    }

    return this.teamMessages();
  }
}
