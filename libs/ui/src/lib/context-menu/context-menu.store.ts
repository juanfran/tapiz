import { Injectable } from '@angular/core';
import { rxState } from '@rx-angular/state';
import { rxActions } from '@rx-angular/state/actions';
import { map } from 'rxjs';

interface ContextMenuState {
  open: boolean;
  position: { x: number; y: number } | null;
  items: ContextMenuItem[];
}

const initialState: ContextMenuState = {
  open: false,
  position: null,
  items: [],
};

export interface ContextMenuItem {
  label: string;
  icon?: string;
  help?: string;
  action: (event: MouseEvent) => void;
}

export interface ContextMenuOptions {
  element: HTMLElement;
  items: () => ContextMenuItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ContextMenuStore {
  actions = rxActions<{
    close: void;
    open: { position: { x: number; y: number }; items: ContextMenuItem[] };
  }>();

  #state = rxState<ContextMenuState>(({ set, connect }) => {
    set(initialState);

    connect(
      this.actions.open$.pipe(
        map(({ position, items }) => {
          return {
            open: true,
            position,
            items,
          };
        }),
      ),
    );

    connect(
      this.actions.close$.pipe(
        map(() => {
          return {
            open: false,
            position: null,
            items: [],
          };
        }),
      ),
    );
  });

  public config(options: ContextMenuOptions) {
    const { element, items } = options;

    element.addEventListener('contextmenu', (event: Event) => {
      event.preventDefault();
      event.stopPropagation();

      const pointerEvent = event as PointerEvent;

      const { x, y } = {
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
      };

      this.actions.open({ position: { x, y }, items: items() });
    });
  }

  readonly open = this.#state.signal('open');
  readonly open$ = this.#state.select('open');
  readonly position = this.#state.signal('position');
  readonly items = this.#state.signal('items');
}
