import { Injectable, inject } from '@angular/core';
import { fromEvent, animationFrameScheduler, Observable, Subject } from 'rxjs';
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
import { selectPosition } from '../selectors/page.selectors';
import { pageFeature } from '../reducers/page.reducer';

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
    this.mouseDown$ = fromEvent<MouseEvent>(workLayer, 'mousedown').pipe(
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

    this.mouseUp$ = fromEvent<MouseEvent>(window, 'mouseup');

    this.mouseMove$ = fromEvent<MouseEvent>(workLayer, 'mousemove').pipe(
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
      withLatestFrom(this.store.select(selectPosition)),
      map(([moveDiff, position]) => {
        return {
          x: position.x - moveDiff.x,
          y: position.y - moveDiff.y,
        } as Point;
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
        this.store.select(pageFeature.selectZoom),
        this.store.select(pageFeature.selectPosition),
        this.store.select(pageFeature.selectBoardMode),
        this.store.select(pageFeature.selectPanInProgress),
      ),
      map(([event, zoom, position, layer, panInProgress]) => {
        return {
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
