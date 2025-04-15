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
  startWith,
} from 'rxjs/operators';
import type { Point, RotatableHost } from '@tapiz/board-commons';
import {
  compose,
  decomposeTSR,
  rotateDEG,
  translate,
} from 'transformation-matrix';
import { concatLatestFrom } from '@ngrx/operators';

export interface MouseDownAndMoveEvent {
  type: 'start' | 'move';
  event: {
    shiftKey: boolean;
    x: number;
    y: number;
  };
  initialPosition: Point;
}

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

  public mouseDownAndMove(el: HTMLElement): Observable<MouseDownAndMoveEvent> {
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
          shiftKey: mouseDown.shiftKey,
          x: mouseDown.x / zoom,
          y: mouseDown.y / zoom,
        };
      }),
    );

    const mouseUp$ = fromEvent<MouseEvent>(window, 'mouseup');

    const mouseMove$ = fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(0, animationFrameScheduler),
      withLatestFrom(setUpConfig.zoom),
      map(([mouseMove, zoom]) => {
        return {
          shiftKey: mouseMove.shiftKey,
          x: mouseMove.x / zoom,
          y: mouseMove.y / zoom,
        };
      }),
    );

    return mouseDown$.pipe(
      switchMap((e) => {
        const initialPosition = {
          x: e.x,
          y: e.y,
        };

        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          map((event) => {
            return {
              type: 'move',
              event,
              initialPosition,
            } satisfies MouseDownAndMoveEvent;
          }),
          startWith({
            type: 'start',
            event: e,
            initialPosition,
          } satisfies MouseDownAndMoveEvent),
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
