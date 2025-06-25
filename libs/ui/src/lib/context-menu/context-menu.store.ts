import { Injectable } from '@angular/core';
import { patchState, signalState } from '@ngrx/signals';

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
  isValid: (event: Event) => boolean;
  items: () => ContextMenuItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ContextMenuStore {
  state = signalState<ContextMenuState>(initialState);

  open({
    position,
    items,
  }: {
    position: { x: number; y: number };
    items: ContextMenuItem[];
  }) {
    patchState(this.state, () => {
      return {
        open: true,
        position,
        items,
      };
    });
  }

  close() {
    patchState(this.state, () => {
      return {
        open: false,
        position: null,
        items: [],
      };
    });
  }

  config(options: ContextMenuOptions) {
    const { element, items } = options;

    let lastMouseDownPosition: { x: number; y: number } | null = null;

    element.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      lastMouseDownPosition = {
        x: event.clientX,
        y: event.clientY,
      };
    });

    element.addEventListener('mouseup', (event: MouseEvent) => {
      if (!event.target || event.button !== 2 || !options.isValid(event)) {
        return;
      }

      // Prevent context menu from showing up if the user has dragged the mouse
      if (
        lastMouseDownPosition &&
        Math.abs(lastMouseDownPosition.x - event.clientX) > 5 &&
        Math.abs(lastMouseDownPosition.y - event.clientY) > 5
      ) {
        return;
      }

      const el = event.target as HTMLInputElement;

      if (el.tagName.toUpperCase() !== 'tapiz-board'.toUpperCase()) {
        const isProsemirror = el.closest('.ProseMirror');

        if (isProsemirror) {
          return;
        }

        const inWorkLayer = el.closest('.work-layer');

        if (!inWorkLayer) {
          return;
        }
      }

      const { x, y } = {
        x: event.clientX,
        y: event.clientY,
      };

      this.open({ position: { x, y }, items: items() });
    });
  }
}
