import { Injectable } from '@angular/core';
import { fromEvent, animationFrameScheduler } from 'rxjs';
import {
  map,
  switchMap,
  takeUntil,
  throttleTime,
  endWith,
  pairwise,
  withLatestFrom,
} from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectZoom } from '../selectors/board.selectors';

@Injectable({
  providedIn: 'root',
})
export class MoveService {
  constructor(private store: Store) {}

  public listenAreaSelector(el: HTMLElement) {
    const mouseDown$ = fromEvent<MouseEvent>(el, 'mousedown');

    const mouseUp$ = fromEvent<MouseEvent>(window, 'mouseup');

    const mouseMove$ = fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(0, animationFrameScheduler),
      map((mouseMove) => {
        return {
          x: mouseMove.clientX,
          y: mouseMove.clientY,
        };
      })
    );

    return mouseDown$.pipe(
      switchMap((initialPosition) => {
        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          map((mouseMove) => {
            return {
              x: -(initialPosition.x - mouseMove.x),
              y: -(initialPosition.y - mouseMove.y),
            };
          }),
          endWith(null)
        );
      })
    );
  }

  public listenIncrementalAreaSelector(el: HTMLElement) {
    const mouseDown$ = fromEvent<MouseEvent>(el, 'mousedown');

    const mouseUp$ = fromEvent<MouseEvent>(window, 'mouseup');

    const mouseMove$ = fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(0, animationFrameScheduler),
      map((mouseMove) => {
        return {
          x: mouseMove.clientX,
          y: mouseMove.clientY,
        };
      })
    );

    return mouseDown$.pipe(
      switchMap(() => {
        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          withLatestFrom(this.store.select(selectZoom)),
          map(([mouseMoveEvent, zoom]) => {
            return {
              x: mouseMoveEvent.x / zoom,
              y: mouseMoveEvent.y / zoom,
            };
          }),
          pairwise(),
          map(([mouseMovePrev, mouseMoveCurr]) => {
            return {
              x: -(mouseMovePrev.x - mouseMoveCurr.x),
              y: -(mouseMovePrev.y - mouseMoveCurr.y),
            };
          }),
          endWith(null)
        );
      })
    );
  }
}
