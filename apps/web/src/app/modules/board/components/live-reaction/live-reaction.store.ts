import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Point } from '@tapiz/board-commons';
import { WsService } from '../../../ws/services/ws.service';
import { BoardActions } from '../../actions/board.actions';

export interface EmojiMessage {
  data: {
    type: 'emoji';
    url: string;
    position: Point;
  };
}

type LiveReactionsState = {
  emojis: {
    id: symbol;
    url: string;
    position: Point;
  }[];
};

const initialState: LiveReactionsState = {
  emojis: [],
};

export const LiveReactionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, wsService = inject(WsService)) => {
    function addEmoji(url: string, position: Point) {
      const id = Symbol();

      patchState(store, (state) => {
        return {
          ...state,
          emojis: [
            ...state.emojis,
            {
              id,
              url,
              position,
            },
          ],
        };
      });

      setTimeout(() => {
        patchState(store, (state) => {
          return {
            ...state,
            emojis: state.emojis.filter((emoji) => emoji.id !== id),
          };
        });
      }, 4000);
    }

    return {
      broadcast: (url: string, position: Point) => {
        wsService.send([
          BoardActions.broadcast({
            data: {
              type: 'emoji',
              url,
              position,
            },
          } satisfies EmojiMessage),
        ]);

        addEmoji(url, position);
      },
      add(url: string, position: Point) {
        addEmoji(url, position);
      },
    };
  }),
);
