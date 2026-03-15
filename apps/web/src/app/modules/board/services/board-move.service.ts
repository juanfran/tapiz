import { Injectable, inject } from '@angular/core';
import {
  fromEvent,
  merge,
  animationFrameScheduler,
  Observable,
  Subject,
} from 'rxjs';
import {
  map,
  pairwise,
  switchMap,
  takeUntil,
  throttleTime,
  share,
  filter,
  withLatestFrom,
  take,
} from 'rxjs/operators';
import { Point } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../reducers/boardPage.reducer';

function touchToMouse(touch: Touch, type: string): MouseEvent {
  return new MouseEvent(type, {
    clientX: touch.clientX,
    clientY: touch.clientY,
    button: 0,
    bubbles: true,
  });
}

@Injectable({
  providedIn: 'root',
})
export class BoardMoveService {
  private store = inject(Store);
  public move$!: Observable<Point>;
  public mouseMove$!: Observable<Point>;
  public mouseDown$!: Observable<MouseEvent>;
  public mouseUp$!: Observable<MouseEvent>;
  public boardMove$!: Observable<Point>;
  public currentMouseDownWatch$?: Subject<void>;

  public listen(workLayer: HTMLElement) {
    const mouseDown = fromEvent<MouseEvent>(workLayer, 'mousedown');
    const touchStart = fromEvent<TouchEvent>(workLayer, 'touchstart').pipe(
      filter((e) => e.touches.length === 1),
      map((e) => {
        e.preventDefault();
        return touchToMouse(e.touches[0], 'mousedown');
      }),
    );

    this.mouseDown$ = merge(mouseDown, touchStart).pipe(
      filter((e) => {
        const targetElement = e.target as HTMLElement;
        if (targetElement.tagName.toLowerCase() === 'tapiz-board') {
          e.preventDefault();
          e.stopPropagation();

          if (document.activeElement) {
            (document.activeElement as HTMLElement).blur();
          }

          workLayer.focus();

          return true;
        }

        return false;
      }),
      share(),
    );

    const mouseUp = fromEvent<MouseEvent>(window, 'mouseup');
    const touchEnd = fromEvent<TouchEvent>(window, 'touchend').pipe(
      map((e) => {
        const touch = e.changedTouches[0];
        return touchToMouse(touch, 'mouseup');
      }),
    );
    this.mouseUp$ = merge(mouseUp, touchEnd);

    const mouseMove = fromEvent<MouseEvent>(workLayer, 'mousemove');
    const touchMove = fromEvent<TouchEvent>(workLayer, 'touchmove').pipe(
      filter((e) => e.touches.length === 1),
      map((e) => {
        e.preventDefault();
        return touchToMouse(e.touches[0], 'mousemove');
      }),
    );

    this.mouseMove$ = merge(mouseMove, touchMove).pipe(
      throttleTime(0, animationFrameScheduler),
      map((mouseMove) => {
        return {
          x: Math.round(mouseMove.clientX),
          y: Math.round(mouseMove.clientY),
        };
      }),
      share(),
    );

    this.move$ = this.mouseDown$.pipe(
      switchMap(() => {
        return this.mouseMove$.pipe(
          pairwise(),
          map(([mouseMovePrev, mouseMoveCurr]) => {
            return {
              x: mouseMovePrev.x - mouseMoveCurr.x,
              y: mouseMovePrev.y - mouseMoveCurr.y,
            };
          }),
          takeUntil(this.mouseUp$),
        );
      }),
      share(),
    );

    this.boardMove$ = this.move$.pipe(
      withLatestFrom(this.store.select(boardPageFeature.selectPosition)),
      map(([moveDiff, position]) => {
        return {
          x: position.x - moveDiff.x,
          y: position.y - moveDiff.y,
        } satisfies Point;
      }),
    );
  }

  public nextMouseDown() {
    if (this.currentMouseDownWatch$) {
      this.currentMouseDownWatch$.next();
      this.currentMouseDownWatch$.complete();
    }

    this.currentMouseDownWatch$ = new Subject();

    return this.mouseDown$.pipe(
      take(1),
      takeUntil(this.currentMouseDownWatch$),
    );
  }

  public relativeMouseDown() {
    return this.mouseDown$.pipe(
      withLatestFrom(
        this.store.select(boardPageFeature.selectZoom),
        this.store.select(boardPageFeature.selectPosition),
        this.store.select(boardPageFeature.selectBoardMode),
        this.store.select(boardPageFeature.selectPanInProgress),
      ),
      map(([event, zoom, position, layer, panInProgress]) => {
        return {
          button: event.button,
          layer,
          position: {
            x: (-position.x + event.clientX) / zoom,
            y: (-position.y + event.clientY) / zoom,
          },
          panInProgress,
        };
      }),
    );
  }
}
