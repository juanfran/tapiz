import { Injectable, inject } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  share,
  startWith,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { Point } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../reducers/boardPage.reducer';
import {
  isBoardWheelTarget,
  isLikelyTrackpadPinchEvent,
} from './board-wheel.utils';
import { BoardWheelInputService } from './board-wheel-input.service';

@Injectable({
  providedIn: 'root',
})
export class BoardZoomService {
  private store = inject(Store);
  #wheelInput = inject(BoardWheelInputService);
  public zoomMove$!: Observable<[Point, number]>;
  public zoom$!: Observable<{
    zoom: number;
    point: Point;
  }>;

  constructor() {
    const maxZoom = 2.5;
    const minZoom = 0.1;
    const stepZoom = 0.075;
    const pinchZoomFactor = 0.999;

    const wheel$ = fromEvent<WheelEvent>(window, 'wheel', {
      passive: false,
    }).pipe(
      share(),
      filter((event) => {
        return (
          isBoardWheelTarget(event.target) &&
          this.#wheelInput.isZoomEvent(event)
        );
      }),
      tap((event) => {
        event.preventDefault();
      }),
    );

    this.zoom$ = wheel$.pipe(
      map((event) => {
        return {
          deltaY: event.deltaY,
          isPinch: isLikelyTrackpadPinchEvent(event),
          point: {
            x: event.clientX,
            y: event.clientY,
          },
        };
      }),
      withLatestFrom(this.store.select(boardPageFeature.selectZoom)),
      map(([zoomEvent, currentZoom]) => {
        if (zoomEvent.isPinch) {
          return {
            point: zoomEvent.point,
            zoom: currentZoom * pinchZoomFactor ** zoomEvent.deltaY,
          };
        }

        if (zoomEvent.deltaY > 0) {
          return {
            point: zoomEvent.point,
            zoom: currentZoom - stepZoom,
          };
        }

        return {
          point: zoomEvent.point,
          zoom: currentZoom + stepZoom,
        };
      }),
      map((zoomEvent) => {
        if (zoomEvent.zoom >= maxZoom) {
          zoomEvent.zoom = maxZoom;

          return zoomEvent;
        } else if (zoomEvent.zoom <= minZoom) {
          zoomEvent.zoom = minZoom;
          return zoomEvent;
        }

        return zoomEvent;
      }),
      distinctUntilChanged((prev, curr) => {
        return prev.zoom === curr.zoom;
      }),
      share(),
    );

    this.zoomMove$ = this.zoom$.pipe(
      startWith({ zoom: 1, point: { x: 0, y: 0 } }),
      withLatestFrom(
        this.store.select(boardPageFeature.selectZoom),
        this.store.select(boardPageFeature.selectPosition),
      ),
      map(([zoomEvent, prevZoomEvent, position]) => {
        const xs = (zoomEvent.point.x - position.x) / prevZoomEvent;
        const ys = (zoomEvent.point.y - position.y) / prevZoomEvent;

        return [
          {
            x: zoomEvent.point.x - xs * zoomEvent.zoom,
            y: zoomEvent.point.y - ys * zoomEvent.zoom,
          },
          zoomEvent.zoom,
        ];
      }),
    );
  }
}
