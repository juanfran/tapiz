import { Injectable } from '@angular/core';
import { fromEvent, animationFrameScheduler, Observable } from 'rxjs';
import {
  map,
  switchMap,
  takeUntil,
  throttleTime,
  endWith,
  withLatestFrom,
  tap,
} from 'rxjs/operators';
import type {
  Resizable,
  ResizePosition,
  Point,
  RotatableHost,
} from '@tapiz/board-commons';
import {
  compose,
  decomposeTSR,
  rotate,
  rotateDEG,
  translate,
} from 'transformation-matrix';
import { concatLatestFrom } from '@ngrx/operators';
import { filterNil } from 'ngxtension/filter-nil';

@Injectable({
  providedIn: 'root',
})
export class MoveService {
  private setUpConfig?: {
    zoom: Observable<number>;
    relativePosition: Observable<Point>;
  };

  public setUp(setUpConfig: MoveService['setUpConfig']) {
    this.setUpConfig = setUpConfig;
  }

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
      }),
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
          endWith(null),
        );
      }),
    );
  }

  public listenIncrementalAreaSelector(
    el: HTMLElement,
    host: Resizable,
    position: ResizePosition,
    onStart: () => void,
  ) {
    const setUpConfig = this.setUpConfig;

    if (!setUpConfig) {
      throw new Error('MoveService.setUp() must be called before use');
    }

    const mouseDown$ = fromEvent<MouseEvent>(el, 'mousedown').pipe(
      tap((event) => {
        event.preventDefault();
        event.stopPropagation();
      }),
      withLatestFrom(setUpConfig.zoom),
      map(([mouseDown, zoom]) => {
        return {
          x: mouseDown.x / zoom,
          y: mouseDown.y / zoom,
        };
      }),
    );

    const mouseUp$ = fromEvent<MouseEvent>(window, 'mouseup');

    const mouseMove$ = fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(0, animationFrameScheduler),
      withLatestFrom(setUpConfig.zoom),
      map(([mouseDown, zoom]) => {
        return {
          x: mouseDown.x / zoom,
          y: mouseDown.y / zoom,
        };
      }),
    );

    return mouseDown$.pipe(
      switchMap((event) => {
        const initialPosition = {
          x: event.x,
          y: event.y,
          hostX: host.position.x,
          hostY: host.position.y,
          width: host.width,
          height: host.height,
        };

        onStart();

        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          map((mouseMove) => {
            return {
              diffX: mouseMove.x - initialPosition.x,
              diffY: mouseMove.y - initialPosition.y,
            };
          }),
          filterNil(),
          map((mouseMove) => {
            const rotation = host.rotation ?? 0;
            const angle = rotation * (Math.PI / 180);
            const deltaX = Math.round(
              mouseMove.diffX * Math.cos(angle) +
                mouseMove.diffY * Math.sin(angle),
            );
            const deltaY = Math.round(
              mouseMove.diffY * Math.cos(angle) -
                mouseMove.diffX * Math.sin(angle),
            );

            let newWidth = initialPosition.width;
            let newHeight = initialPosition.height;

            let currentMatrix = compose(
              translate(initialPosition.hostX, initialPosition.hostY),
              rotate(angle),
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
          endWith(null),
        );
      }),
    );
  }

  public listenRotation(
    el: HTMLElement,
    host: RotatableHost,
    onStart: () => void,
  ) {
    const setUpConfig = this.setUpConfig;

    if (!setUpConfig) {
      throw new Error('MoveService.setUp() must be called before use');
    }

    const mouseUp$ = fromEvent<MouseEvent>(window, 'mouseup');
    const R2D = 180 / Math.PI;

    const mouseDown$ = fromEvent<MouseEvent>(el, 'mousedown').pipe(
      concatLatestFrom(() => setUpConfig.relativePosition),
    );

    const mouseMove$ = fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(0, animationFrameScheduler),
    );

    return mouseDown$.pipe(
      switchMap(([, userPosition]) => {
        onStart();

        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          concatLatestFrom(() => setUpConfig.zoom),
          map(([mouseMove, zoom]) => {
            return {
              x: mouseMove.x / zoom - userPosition.x / zoom,
              y: mouseMove.y / zoom - userPosition.y / zoom,
            };
          }),
        );
      }),
      map((event) => {
        const center = {
          x: host.width / 2,
          y: host.height / 2,
        };

        let currentMatrix = compose(
          translate(host.position.x, host.position.y),
          rotateDEG(host.rotation),
        );

        currentMatrix = compose(
          currentMatrix,
          rotateDEG(-host.rotation, center.x, center.y),
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
          rotateDEG(angle, center.x, center.y),
        );

        const decomposed = decomposeTSR(currentMatrix);

        return {
          rotation: decomposed.rotation.angle * R2D,
          x: decomposed.translate.tx,
          y: decomposed.translate.ty,
        };
      }),
    );
  }
}
