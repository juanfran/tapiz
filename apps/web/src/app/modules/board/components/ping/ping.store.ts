import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { Point } from '@tapiz/board-commons';
import { WsService } from '../../../ws/services/ws.service';
import { BoardActions } from '../../actions/board.actions';

export interface PingMessage {
  data: {
    type: 'ping';
    position: Point;
  };
}

type PingState = {
  pings: {
    id: symbol;
    position: Point;
  }[];
};

const initialState: PingState = {
  pings: [],
};

const PING_DURATION = 5000;

export const PingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, wsService = inject(WsService)) => {
    function addPing(position: Point) {
      const id = Symbol();

      patchState(store, (state) => {
        return {
          ...state,
          pings: [
            ...state.pings,
            {
              id,
              position,
            },
          ],
        };
      });

      setTimeout(() => {
        patchState(store, (state) => {
          return {
            ...state,
            pings: state.pings.filter((ping) => ping.id !== id),
          };
        });
      }, PING_DURATION);
    }

    return {
      broadcast: (position: Point) => {
        wsService.send([
          BoardActions.broadcast({
            data: {
              type: 'ping',
              position,
            },
          } satisfies PingMessage),
        ]);

        addPing(position);
      },
      add(position: Point) {
        addPing(position);
      },
    };
  }),
);
