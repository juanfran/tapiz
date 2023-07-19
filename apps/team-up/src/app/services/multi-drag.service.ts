import { ApplicationRef, Injectable, inject } from '@angular/core';
import {
  Subject,
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
import { Draggable } from '../modules/board/models/draggable.model';
import { concatLatestFrom } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filterNil } from '../commons/operators/filter-nil';
import {
  selectDragEnabled,
  selectPosition,
  selectZoom,
} from '../modules/board/selectors/page.selectors';
import { NodeType, Point } from '@team-up/board-commons';
import { PageActions } from '../modules/board/actions/page.actions';
import { BoardActions } from '../modules/board/actions/board.actions';
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

  private store = inject(Store);
  private appRef = inject(ApplicationRef);

  private dragElements = new Map<
    Draggable['id'],
    {
      init: Point;
      final: Point | null;
      type: NodeType;
    }
  >();

  private snap = 50;

  public draggableElements: Draggable[] = [];

  public add(draggable: Draggable) {
    this.draggableElements.push(draggable);

    this.listen(draggable);
  }

  public remove(draggable: Draggable) {
    this.draggableElements = this.draggableElements.filter(
      (d) => d !== draggable
    );
  }

  public listen(draggable: Draggable) {
    const keydown$ = fromEvent<KeyboardEvent>(document, 'keydown');
    const keyup$ = fromEvent<KeyboardEvent>(document, 'keyup');
    const controlPressed$ = merge(keydown$, keyup$).pipe(
      map((event) => event.ctrlKey),
      startWith(false)
    );

    const mouseDown$ = merge(
      fromEvent<MouseEvent>(draggable.nativeElement, 'mousedown').pipe(
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

        return !draggable.preventDrag;
      }),
      concatLatestFrom(() => this.store.select(selectDragEnabled)),
      filter(([, dragEnabled]) => dragEnabled),
      map(([event]) => event)
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
      withLatestFrom(
        this.store.select(selectZoom),
        this.store.select(selectPosition)
      ),
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
      withLatestFrom(
        this.store.select(selectZoom),
        this.store.select(selectPosition)
      ),
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

    move$
      .pipe(
        withLatestFrom(controlPressed$),
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

        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: false,
            actions: [
              {
                data: {
                  type: draggable.nodeType,
                  node: {
                    id: draggable.id,
                    position,
                  },
                },
                op: 'patch',
              },
            ],
          })
        );

        this.appRef.tick();
      });
  }

  private endDrag() {
    const actions: {
      id: string;
      nodeType: NodeType;
      initialPosition: Point;
      finalPosition: Point;
    }[] = [];

    this.dragElements.forEach((dragElement, id) => {
      if (dragElement.final) {
        actions.push({
          nodeType: dragElement.type,
          id,
          initialPosition: dragElement.init,
          finalPosition: dragElement.final,
        });
      }
    });

    if (actions.length) {
      this.store.dispatch(PageActions.endDragNode({ nodes: actions }));
    }

    this.dragElements.clear();
  }
}
