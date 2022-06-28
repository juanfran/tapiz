import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { wsMessage, wsOpen } from '../ws.actions';

@Injectable({
  providedIn: 'root',
})
export class WsService {
  private ws!: WebSocket;

  constructor(private store: Store, private actions$: Actions) {}

  public listen() {
    this.ws = new WebSocket('ws://localhost:8080');

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

  public send(obj: unknown) {
    const data = JSON.stringify(obj);
    this.ws.send(data);
  }

  public close() {
    this.ws.close();
  }
}
