import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Point } from '@tapiz/board-commons';
import { WsService } from '../../../ws/services/ws.service';
import { BoardActions } from '../../actions/board.actions';

type LiveReactionsState = {
  emojis: {
    id: symbol;
    emoji: string;
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
    function addEmoji(emoji: string, position: Point) {
      const id = Symbol();

      patchState(store, (state) => {
        return {
          ...state,
          emojis: [
            ...state.emojis,
            {
              id,
              emoji,
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
      }, 2000);
    }

    return {
      broadcast: (emoji: string, position: Point) => {
        wsService.send([
          BoardActions.broadcast({
            data: {
              type: 'emoji',
              emoji,
              position,
            },
          }),
        ]);

        addEmoji(emoji, position);
      },
      add(emoji: string, position: Point) {
        addEmoji(emoji, position);
      },
    };
  }),
);
