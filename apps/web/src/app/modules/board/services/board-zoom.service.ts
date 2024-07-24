import { Injectable, inject } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  share,
  startWith,
  withLatestFrom,
} from 'rxjs/operators';
import { Point } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { selectPosition, selectZoom } from '../selectors/page.selectors';

@Injectable({
  providedIn: 'root',
})
export class BoardZoomService {
  private store = inject(Store);
  public zoomMove$!: Observable<[Point, number]>;
  public zoom$!: Observable<{
    zoom: number;
    point: Point;
  }>;

  constructor() {
    const maxZoom = 2.5;
    const minZoom = 0.1;
    const stepZoom = 0.075;

    const wheel$ = fromEvent<WheelEvent>(window, 'wheel').pipe(
      share(),
      filter((event) => {
        const target = event.target as HTMLElement | undefined;

        if (target) {
          if (
            target.tagName.toUpperCase() !== 'TAPIZ-BOARD' &&
            !target.closest('tapiz-nodes') &&
            !target.closest('tapiz-board-editor-portal')
          ) {
            return false;
          }

          if (target.closest('[board-noscroll]')) {
            return false;
          }
        }

        return true;
      }),
    );

    this.zoom$ = wheel$.pipe(
      map((event) => {
        return {
          zoom: Math.sign(event.deltaY),
          point: {
            x: event.clientX,
            y: event.clientY,
          },
        };
      }),
      withLatestFrom(this.store.select(selectZoom)),
      map(([zoomEvent, zoom]) => {
        if (zoomEvent.zoom > 0) {
          return {
            point: zoomEvent.point,
            zoom: zoom - stepZoom,
          };
        }

        return {
          point: zoomEvent.point,
          zoom: zoom + stepZoom,
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
        this.store.select(selectZoom),
        this.store.select(selectPosition),
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
