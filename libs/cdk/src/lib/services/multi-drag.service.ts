import { DestroyRef, Injectable } from '@angular/core';
import {
  Observable,
  Subject,
  animationFrameScheduler,
  filter,
  fromEvent,
  map,
  take,
  takeUntil,
  throttleTime,
  withLatestFrom,
} from 'rxjs';
import { concatLatestFrom } from '@ngrx/operators';
import { Point, TuNode } from '@tapiz/board-commons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface Draggable {
  id: string;
  nodeType: string;
  handler: HTMLElement;
  destroyRef: DestroyRef;
  position: () => Point;
  preventDrag?: () => boolean;
  drop?: () => void;
}

interface SetupConfig {
  dragEnabled: Observable<boolean>;
  draggableId: Observable<string[]>;
  zoom: Observable<number>;
  relativePosition: Observable<Point>;
  nodes: () => TuNode[];
  move: (
    elements: {
      draggable: Draggable;
      position: Point;
    }[],
  ) => void;
  end: (
    dragged: {
      draggable: Draggable;
      initialPosition: Point;
      initialIndex: number;
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
      initialIndex: number;
      final: Point | null;
      draggable: Draggable;
    }
  >();

  #snap = 50;
  #setUpConfig?: SetupConfig;
  #eventInitialPoisition: null | Point = null;

  draggableElements: Draggable[] = [];
  move$ = new Subject<DragEvent>();

  remove(draggable: Draggable['id']) {
    this.draggableElements = this.draggableElements.filter(
      (d) => d.id !== draggable,
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

    this.remove(draggable.id);

    this.draggableElements.push(draggable);

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
          this.remove(draggable.id);
        },
      });
  }

  startDrag(destroyRef: DestroyRef) {
    const setUpConfig = this.#setUpConfig;

    if (!setUpConfig) {
      return;
    }

    this.#eventInitialPoisition = null;

    fromEvent<MouseEvent>(document.body, 'mousemove')
      .pipe(
        throttleTime(0, animationFrameScheduler),
        takeUntil(fromEvent<MouseEvent>(window, 'mouseup')),
        takeUntilDestroyed(destroyRef),
        withLatestFrom(setUpConfig.zoom, setUpConfig.relativePosition),
        map(([mouseMove, zoom, position]) => {
          const posX = -position.x + mouseMove.x;
          const posY = -position.y + mouseMove.y;

          return {
            position: {
              x: posX / zoom,
              y: posY / zoom,
            },
            ctrlKey: mouseMove.ctrlKey,
          };
        }),
      )
      .subscribe({
        next: (event) => {
          if (!this.#eventInitialPoisition) {
            this.#eventInitialPoisition = {
              x: event.position.x,
              y: event.position.y,
            };
          }

          this.#move(event);
        },
        complete: () => {
          if (!this.#dragElements.size) {
            return;
          }

          this.#endDrag();
        },
      });
  }

  #move(event: { position: Point; ctrlKey: boolean }) {
    const setUpConfig = this.#setUpConfig;

    if (!setUpConfig) {
      return;
    }

    let startPositionDiff: null | Point = null;

    setUpConfig.draggableId.pipe(take(1)).subscribe((draggableId) => {
      const eventInitialPosition = this.#eventInitialPoisition;

      if (!eventInitialPosition) {
        return;
      }

      const dragResult = this.draggableElements
        .filter((draggable) => {
          if (draggableId.includes(draggable.id)) {
            if (draggable.preventDrag) {
              return !draggable.preventDrag();
            }

            return true;
          }

          return false;
        })
        .map((draggable) => {
          if (!this.#dragElements.has(draggable.id)) {
            const initialPosition = draggable.position();
            const initialIndex = setUpConfig
              .nodes()
              .findIndex((it) => it.id === draggable.id);

            this.#dragElements.set(draggable.id, {
              init: initialPosition,
              initialIndex,
              final: null,
              draggable,
            });
          }

          const initialPosition = this.#dragElements.get(draggable.id)
            ?.init ?? { x: 0, y: 0 };

          startPositionDiff = {
            x: eventInitialPosition.x - initialPosition.x,
            y: eventInitialPosition.y - initialPosition.y,
          };

          let finalPosition = {
            x: Math.round(event.position.x - startPositionDiff.x),
            y: Math.round(event.position.y - startPositionDiff.y),
          };

          if (event.ctrlKey) {
            finalPosition = {
              x: Math.round(finalPosition.x / this.#snap) * this.#snap,
              y: Math.round(finalPosition.y / this.#snap) * this.#snap,
            };
          }

          const draggableElement = this.#dragElements.get(draggable.id);

          if (draggableElement) {
            this.#dragElements.set(draggable.id, {
              ...draggableElement,
              final: {
                x: finalPosition.x,
                y: finalPosition.y,
              },
            });
          }

          return {
            draggable,
            position: {
              x: finalPosition.x,
              y: finalPosition.y,
            },
          };
        });

      this.#setUpConfig?.move(dragResult);
    });
  }

  #endDrag() {
    const actions: {
      draggable: Draggable;
      initialPosition: Point;
      initialIndex: number;
      finalPosition: Point;
    }[] = [];

    this.#dragElements.forEach((dragElement) => {
      if (dragElement.final) {
        actions.push({
          draggable: dragElement.draggable,
          initialPosition: dragElement.init,
          initialIndex: dragElement.initialIndex,
          finalPosition: dragElement.final,
        });

        dragElement.draggable.drop?.();
      }
    });

    this.#setUpConfig?.end(actions);
    this.#dragElements.clear();
  }
}
