import { ApplicationRef, DestroyRef, Injectable, inject } from '@angular/core';
import { filterNil } from 'ngxtension/filter-nil';
import {
  Observable,
  Subject,
  Subscription,
  animationFrameScheduler,
  distinctUntilChanged,
  filter,
  finalize,
  fromEvent,
  map,
  merge,
  startWith,
  switchMap,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs';
import { Draggable } from '../models/draggable.model';
import { concatLatestFrom } from '@ngrx/effects';
import { Point } from '@team-up/board-commons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class MultiDragService {
  #mouseMove$ = new Subject() as Subject<MouseEvent>;
  #mouseDown$ = new Subject() as Subject<MouseEvent>;
  #mouseUp$ = new Subject() as Subject<MouseEvent>;

  public mouseMove$ = this.#mouseMove$.asObservable();
  public mouseDown$ = this.#mouseDown$.asObservable();
  public mouseUp$ = this.#mouseUp$.asObservable();

  public updateSharedMouseMove(mouseMove: MouseEvent) {
    this.#mouseMove$.next(mouseMove);
  }

  public updateSharedMouseDown(mouseDown: MouseEvent) {
    this.#mouseDown$.next(mouseDown);
  }

  public updateSharedMouseUp(mouseUp: MouseEvent) {
    this.#mouseUp$.next(mouseUp);
  }

  private appRef = inject(ApplicationRef);

  private dragElements = new Map<
    Draggable['id'],
    {
      init: Point;
      final: Point | null;
      type: string;
    }
  >();

  private subscriptions = new Map<Draggable['id'], Subscription>();

  private snap = 50;
  private setUpConfig?: {
    dragEnabled: Observable<boolean>;
    zoom: Observable<number>;
    relativePosition: Observable<Point>;
    move: (draggable: Draggable, position: Point) => void;
    end: (
      dragged: {
        id: string;
        nodeType: string;
        initialPosition: Point;
        finalPosition: Point;
      }[]
    ) => void;
  };

  public draggableElements: {
    draggableCmp: Draggable;
    destroyRef: DestroyRef;
  }[] = [];

  public setUp(setUpConfig: MultiDragService['setUpConfig']) {
    this.setUpConfig = setUpConfig;
  }

  public add(draggable: Draggable, destroyRef: DestroyRef) {
    this.draggableElements.push({ draggableCmp: draggable, destroyRef });

    destroyRef.onDestroy(() => {
      this.remove(draggable);
    });

    this.listen(draggable, destroyRef);
  }

  public remove(draggable: Draggable) {
    this.draggableElements = this.draggableElements.filter(
      (d) => d.draggableCmp !== draggable
    );

    if (this.subscriptions.has(draggable.id)) {
      this.subscriptions.get(draggable.id)?.unsubscribe();
      this.subscriptions.delete(draggable.id);
    }
  }

  public listen(draggable: Draggable, destroyRef: DestroyRef) {
    const setUpConfig = this.setUpConfig;

    if (!setUpConfig) {
      throw new Error('MultiDragService.setUp() must be called before use');
    }

    const keydown$ = fromEvent<KeyboardEvent>(document, 'keydown');
    const keyup$ = fromEvent<KeyboardEvent>(document, 'keyup');
    const controlPressed$ = merge(keydown$, keyup$).pipe(
      map((event) => event.ctrlKey),
      startWith(false)
    );

    const handler = draggable.handler ?? draggable.nativeElement;

    const mouseDown$ = merge(
      fromEvent<MouseEvent>(handler, 'mousedown').pipe(
        tap((event) => {
          this.updateSharedMouseDown(event);
        })
      ),
      this.mouseDown$.pipe(filterNil())
    ).pipe(
      distinctUntilChanged(),
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
      })
    );

    const mouseUp$ = merge(
      fromEvent(window, 'mouseup').pipe(
        tap((event) => {
          this.updateSharedMouseUp(event as MouseEvent);
        })
      ),
      this.mouseUp$
    ).pipe(
      map(() => true),
      distinctUntilChanged()
    );

    let startPositionDiff = { x: 0, y: 0 };

    const mouseMove$ = merge(
      fromEvent<MouseEvent>(document.body, 'mousemove').pipe(
        throttleTime(0, animationFrameScheduler),
        tap((event) => {
          // prevent select text on drag note
          event.preventDefault();
          this.updateSharedMouseMove(event);
        })
      ),
      this.mouseMove$.pipe(filterNil())
    ).pipe(
      distinctUntilChanged(),
      map((mouseMove) => {
        return {
          x: mouseMove.clientX,
          y: mouseMove.clientY,
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
      })
    );

    const move$ = mouseDown$.pipe(
      withLatestFrom(setUpConfig.zoom, setUpConfig.relativePosition),
      switchMap(([event, zoom, position]) => {
        const initialPosition = draggable.position ?? { x: 0, y: 0 };

        if (!this.dragElements.has(draggable.id)) {
          this.dragElements.set(draggable.id, {
            init: initialPosition,
            final: null,
            type: draggable.nodeType,
          });
        }

        const posX = -position.x + event.clientX;
        const posY = -position.y + event.clientY;

        startPositionDiff = {
          x: posX / zoom - initialPosition.x,
          y: posY / zoom - initialPosition.y,
        };

        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          finalize(() => {
            this.endDrag();
          })
        );
      })
    );

    const moveSubscription = move$
      .pipe(
        takeUntilDestroyed(destroyRef),
        withLatestFrom(controlPressed$),
        filter(() => {
          return !draggable.preventDrag;
        }),
        map(([move, ctrlPressed]) => {
          let finalPosition = {
            x: Math.round(move.x - startPositionDiff.x),
            y: Math.round(move.y - startPositionDiff.y),
          };

          if (ctrlPressed) {
            finalPosition = {
              x: Math.round(finalPosition.x / this.snap) * this.snap,
              y: Math.round(finalPosition.y / this.snap) * this.snap,
            };
          }

          return finalPosition;
        })
      )
      .subscribe((position) => {
        const draggableElement = this.dragElements.get(draggable.id);

        if (draggableElement) {
          this.dragElements.set(draggable.id, {
            ...draggableElement,
            final: position,
          });
        }

        this.setUpConfig?.move(draggable, position);

        this.appRef.tick();
      });

    this.subscriptions.set(draggable.id, moveSubscription);
  }

  private endDrag() {
    const actions: {
      id: string;
      nodeType: string;
      initialPosition: Point;
      finalPosition: Point;
    }[] = [];

    this.dragElements.forEach((dragElement, id) => {
      if (dragElement.final) {
        actions.push({
          id,
          nodeType: dragElement.type,
          initialPosition: dragElement.init,
          finalPosition: dragElement.final,
        });
      }
    });

    this.setUpConfig?.end(actions);

    this.dragElements.clear();
  }
}
