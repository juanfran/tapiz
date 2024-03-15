import { DestroyRef, Injectable } from '@angular/core';
import {
  Observable,
  Subject,
  animationFrameScheduler,
  filter,
  fromEvent,
  map,
  merge,
  startWith,
  takeUntil,
  throttleTime,
  withLatestFrom,
} from 'rxjs';
import { concatLatestFrom } from '@ngrx/effects';
import { Point } from '@team-up/board-commons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface Draggable {
  id: string;
  nodeType: string;
  handler: HTMLElement;
  destroyRef: DestroyRef;
  position: () => Point;
  preventDrag?: () => boolean;
}

interface SetupConfig {
  dragEnabled: Observable<boolean>;
  draggableId: Observable<string[]>;
  zoom: Observable<number>;
  relativePosition: Observable<Point>;
  move: (draggable: Draggable, position: Point) => void;
  end: (
    dragged: {
      draggable: Draggable;
      initialPosition: Point;
      finalPosition: Point;
    }[],
  ) => void;
}

interface MoveEvent {
  type: 'move';
  position: Point;
}

interface EndEvent {
  type: 'end';
}

type DragEvent = MoveEvent | EndEvent;

@Injectable({
  providedIn: 'root',
})
export class MultiDragService {
  #dragElements = new Map<
    Draggable['id'],
    {
      init: Point;
      final: Point | null;
      draggable: Draggable;
    }
  >();

  #snap = 50;
  #setUpConfig?: SetupConfig;

  draggableElements: Draggable[] = [];
  move$ = new Subject<DragEvent>();

  remove(draggable: Draggable) {
    this.draggableElements = this.draggableElements.filter(
      (d) => d !== draggable,
    );
  }

  setUp(setUpConfig: SetupConfig) {
    this.#setUpConfig = setUpConfig;
  }

  register(draggable: Draggable) {
    const setUpConfig = this.#setUpConfig;

    if (!setUpConfig) {
      throw new Error('MultiDragService.setUp() must be called before use');
    }

    let startPositionDiff: null | Point = null;

    this.draggableElements.push(draggable);

    const keydown$ = fromEvent<KeyboardEvent>(document, 'keydown');
    const keyup$ = fromEvent<KeyboardEvent>(document, 'keyup');
    const controlPressed$ = merge(keydown$, keyup$).pipe(
      map((event) => event.ctrlKey),
      startWith(false),
    );

    fromEvent<MouseEvent>(draggable.handler, 'mousedown')
      .pipe(
        filter((e) => {
          if ((e.target as HTMLElement).classList.contains('no-drag')) {
            return false;
          }

          return true;
        }),
        concatLatestFrom(() => setUpConfig.dragEnabled),
        filter(([, dragEnabled]) => dragEnabled),
        map(([event]) => {
          return event;
        }),
      )
      .subscribe({
        next: () => {
          this.startDrag(draggable.destroyRef);
        },
        complete: () => {
          this.remove(draggable);
        },
      });

    this.move$
      .pipe(
        takeUntilDestroyed(draggable.destroyRef),
        filter((move) => {
          return move.type === 'end';
        }),
      )
      .subscribe(() => {
        startPositionDiff = null;
      });

    this.move$
      .pipe(
        takeUntilDestroyed(draggable.destroyRef),
        filter((move): move is MoveEvent => {
          return move.type === 'move';
        }),
        filter(() => {
          if (draggable.preventDrag) {
            return !draggable.preventDrag();
          }

          return true;
        }),
        withLatestFrom(setUpConfig.draggableId, controlPressed$),
        filter(([, draggableId]) => {
          return draggableId.includes(draggable.id);
        }),
        map(([event, , ctrlPressed]) => {
          const initialPosition = draggable.position();

          if (!this.#dragElements.has(draggable.id)) {
            this.#dragElements.set(draggable.id, {
              init: initialPosition,
              final: null,
              draggable,
            });
          }

          if (!startPositionDiff) {
            startPositionDiff = {
              x: event.position.x - initialPosition.x,
              y: event.position.y - initialPosition.y,
            };
          }

          let finalPosition = {
            x: Math.round(event.position.x - startPositionDiff.x),
            y: Math.round(event.position.y - startPositionDiff.y),
          };

          if (ctrlPressed) {
            finalPosition = {
              x: Math.round(finalPosition.x / this.#snap) * this.#snap,
              y: Math.round(finalPosition.y / this.#snap) * this.#snap,
            };
          }

          return {
            x: finalPosition.x,
            y: finalPosition.y,
          };
        }),
      )
      .subscribe((position) => {
        const draggableElement = this.#dragElements.get(draggable.id);

        if (draggableElement) {
          this.#dragElements.set(draggable.id, {
            ...draggableElement,
            final: position,
          });
        }

        this.#setUpConfig?.move(draggable, position);
      });
  }

  startDrag(destroyRef: DestroyRef) {
    const setUpConfig = this.#setUpConfig;

    if (!setUpConfig) {
      return;
    }

    fromEvent<MouseEvent>(document.body, 'mousemove')
      .pipe(
        throttleTime(0, animationFrameScheduler),
        takeUntil(fromEvent<MouseEvent>(window, 'mouseup')),
        takeUntilDestroyed(destroyRef),
        map((mouseMove) => {
          return {
            x: mouseMove.x,
            y: mouseMove.y,
          };
        }),
        withLatestFrom(setUpConfig.zoom, setUpConfig.relativePosition),
        map(([move, zoom, position]) => {
          const posX = -position.x + move.x;
          const posY = -position.y + move.y;

          return {
            x: posX / zoom,
            y: posY / zoom,
          };
        }),
      )
      .subscribe({
        next: (position) => {
          this.move$.next({ type: 'move', position });
        },
        complete: () => {
          if (!this.#dragElements.size) {
            return;
          }

          this.move$.next({ type: 'end' });
          this.#endDrag();
        },
      });
  }

  #endDrag() {
    const actions: {
      draggable: Draggable;
      initialPosition: Point;
      finalPosition: Point;
    }[] = [];

    this.#dragElements.forEach((dragElement) => {
      if (dragElement.final) {
        actions.push({
          draggable: dragElement.draggable,
          initialPosition: dragElement.init,
          finalPosition: dragElement.final,
        });
      }
    });

    this.#setUpConfig?.end(actions);
    this.#dragElements.clear();
  }
}
