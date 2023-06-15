import { Injectable } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  scan,
  share,
  startWith,
  withLatestFrom,
} from 'rxjs/operators';
import { Point } from '@team-up/board-commons';
import { Store } from '@ngrx/store';
import { selectPopupOpen, selectPosition } from '../selectors/page.selectors';
import { concatLatestFrom } from '@ngrx/effects';

@Injectable({
  providedIn: 'root',
})
export class BoardZoomService {
  public zoomMove$!: Observable<[Point, number]>;
  public zoom$!: Observable<{
    zoom: number;
    point: Point;
  }>;

  constructor(private store: Store) {
    const maxZoom = 2.5;
    const minZoom = 0.2;

    const wheel$ = fromEvent<WheelEvent>(window, 'wheel').pipe(
      share(),
      concatLatestFrom(() => this.store.select(selectPopupOpen)),
      filter(([event, popup]) => {
        if (popup === 'cocomaterial' || popup === 'search') {
          return false;
        }

        if (event.target) {
          return (event.target as HTMLElement).tagName !== 'EMOJI-PICKER';
        }

        return true;
      }),
      map(([event]) => event)
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
      scan(
        (acc, curr) => {
          if (curr.zoom > 0) {
            return {
              ...curr,
              zoom: acc.zoom - 0.1,
            };
          }

          return {
            ...curr,
            zoom: acc.zoom + 0.1,
          };
        },
        { zoom: 1, point: { x: 0, y: 0 } }
      ),
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
      share()
    );

    this.zoomMove$ = this.zoom$.pipe(
      startWith({ zoom: 1, point: { x: 0, y: 0 } }),
      pairwise(),
      withLatestFrom(this.store.select(selectPosition)),
      map(([[prevZoomEvent, zoomEvent], position]) => {
        const xs = (zoomEvent.point.x - position.x) / prevZoomEvent.zoom;
        const ys = (zoomEvent.point.y - position.y) / prevZoomEvent.zoom;

        return [
          {
            x: zoomEvent.point.x - xs * zoomEvent.zoom,
            y: zoomEvent.point.y - ys * zoomEvent.zoom,
          },
          zoomEvent.zoom,
        ];
      })
    );
  }
}
