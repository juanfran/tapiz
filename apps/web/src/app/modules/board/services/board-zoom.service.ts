import { Injectable, inject } from '@angular/core';
import { fromEvent, merge, Observable, Subject } from 'rxjs';
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
import { boardPageFeature } from '../reducers/boardPage.reducer';

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

  #pinchZoom$ = new Subject<{ zoom: number; point: Point }>();
  #lastPinchDistance = 0;

  constructor() {
    const maxZoom = 2.5;
    const minZoom = 0.1;
    const stepZoom = 0.075;

    this.#setupPinchZoom();

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

    const wheelZoom$ = wheel$.pipe(
      map((event) => {
        return {
          zoom: Math.sign(event.deltaY),
          point: {
            x: event.clientX,
            y: event.clientY,
          },
        };
      }),
    );

    this.zoom$ = merge(wheelZoom$, this.#pinchZoom$).pipe(
      withLatestFrom(this.store.select(boardPageFeature.selectZoom)),
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

  #setupPinchZoom() {
    fromEvent<TouchEvent>(window, 'touchstart', { passive: false }).subscribe(
      (e) => {
        if (e.touches.length === 2) {
          this.#lastPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
        }
      },
    );

    fromEvent<TouchEvent>(window, 'touchmove', { passive: false }).subscribe(
      (e) => {
        if (e.touches.length !== 2) return;

        e.preventDefault();

        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );

        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const delta = this.#lastPinchDistance - distance;
        this.#lastPinchDistance = distance;

        if (Math.abs(delta) > 1) {
          this.#pinchZoom$.next({
            zoom: Math.sign(delta),
            point: { x: centerX, y: centerY },
          });
        }
      },
    );
  }
}
