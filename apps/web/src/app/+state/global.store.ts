import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

const initialState = {
  wsConnectionLost: false,
};

export const GlobalStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setWsConnectionLost: (value: boolean) => {
      patchState(store, {
        wsConnectionLost: value,
      });
    },
  })),
);
