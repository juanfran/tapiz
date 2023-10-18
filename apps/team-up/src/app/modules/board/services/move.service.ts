import { Injectable } from '@angular/core';
import { fromEvent, animationFrameScheduler } from 'rxjs';
import {
  map,
  switchMap,
  takeUntil,
  throttleTime,
  endWith,
  withLatestFrom,
  scan,
} from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectPosition, selectZoom } from '../selectors/page.selectors';
import { Resizable, ResizePosition } from '../models/resizable.model';
import { filterNil } from '@/app/commons/operators/filter-nil';

import {
  compose,
  decomposeTSR,
  rotate,
  rotateDEG,
  translate,
  fromString,
} from 'transformation-matrix';
import { Rotatable } from '../models/rotatable.model';
import { concatLatestFrom } from '@ngrx/effects';

interface Move {
  x: number;
  y: number;
  diffX: number;
  diffY: number;
}

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

  public listenIncrementalAreaSelector(
    el: HTMLElement,
    host: Resizable,
    position: ResizePosition,
    onStart: () => void
  ) {
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
        onStart();

        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          withLatestFrom(this.store.select(selectZoom)),
          map(([mouseMoveEvent, zoom]) => {
            return {
              x: mouseMoveEvent.x / zoom,
              y: mouseMoveEvent.y / zoom,
            };
          }),
          scan((acc: Move | null, curr) => {
            if (!acc) {
              return {
                x: curr.x,
                y: curr.y,
                diffX: 0,
                diffY: 0,
              } as Move;
            }

            return {
              x: curr.x,
              y: curr.y,
              diffX: curr.x - acc.x,
              diffY: curr.y - acc.y,
            } as Move;
          }, null),
          filterNil(),
          map((mouseMove) => {
            const rotation = host.rotation ?? 0;
            const angle = rotation * (Math.PI / 180);
            const deltaX = Math.round(
              mouseMove.diffX * Math.cos(angle) +
                mouseMove.diffY * Math.sin(angle)
            );
            const deltaY = Math.round(
              mouseMove.diffY * Math.cos(angle) -
                mouseMove.diffX * Math.sin(angle)
            );

            let newWidth = host.width;
            let newHeight = host.height;

            let currentMatrix = compose(
              translate(host.position.x, host.position.y),
              rotate(angle)
            );

            if (position === 'top-left') {
              newWidth -= deltaX;
              newHeight -= deltaY;

              currentMatrix = compose(currentMatrix, translate(deltaX, deltaY));
            } else if (position === 'top-right') {
              newWidth += deltaX;
              newHeight -= deltaY;

              currentMatrix = compose(currentMatrix, translate(0, deltaY));
            } else if (position === 'bottom-left') {
              newWidth -= deltaX;
              newHeight += deltaY;

              currentMatrix = compose(currentMatrix, translate(deltaX, 0));
            } else if (position === 'bottom-right') {
              newWidth += deltaX;
              newHeight += deltaY;
            }

            const decomposed = decomposeTSR(currentMatrix);

            if (newWidth < 5 || newHeight < 5) {
              return;
            }

            return {
              x: decomposed.translate.tx,
              y: decomposed.translate.ty,
              width: newWidth,
              height: newHeight,
            };
          }),
          endWith(null)
        );
      })
    );
  }

  public listenRotation(el: HTMLElement, host: Rotatable, onStart: () => void) {
    const mouseUp$ = fromEvent<MouseEvent>(window, 'mouseup');
    const R2D = 180 / Math.PI;

    const mouseDown$ = fromEvent<MouseEvent>(el, 'mousedown').pipe(
      concatLatestFrom(() => this.store.select(selectPosition))
    );

    const mouseMove$ = fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(0, animationFrameScheduler)
    );

    return mouseDown$.pipe(
      switchMap(([, userPosition]) => {
        onStart();

        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          concatLatestFrom(() => this.store.select(selectZoom)),
          map(([mouseMove, zoom]) => {
            return {
              x: mouseMove.pageX / zoom - userPosition.x / zoom,
              y: mouseMove.pageY / zoom - userPosition.y / zoom,
            };
          })
        );
      }),
      map((event) => {
        const center = {
          x: host.width / 2,
          y: host.height / 2,
        };

        let currentMatrix = fromString(host.nativeElement.style.transform);

        currentMatrix = compose(
          currentMatrix,
          rotateDEG(-host.rotation, center.x, center.y)
        );

        const decomposedCalculateCenter = decomposeTSR(currentMatrix);

        const centerX = decomposedCalculateCenter.translate.tx + host.width / 2;
        const centerY =
          decomposedCalculateCenter.translate.ty + host.height / 2;

        const diffX = centerX - event.x;
        const diffY = event.y - centerY;

        const angle = Math.atan2(diffX, diffY) * R2D;

        currentMatrix = compose(
          currentMatrix,
          rotateDEG(angle, center.x, center.y)
        );

        const decomposed = decomposeTSR(currentMatrix);

        return {
          rotation: decomposed.rotation.angle * R2D,
          x: decomposed.translate.tx,
          y: decomposed.translate.ty,
        };
      })
    );
  }
}
