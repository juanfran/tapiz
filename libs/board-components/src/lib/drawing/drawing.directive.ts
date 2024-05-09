import { Directive, ElementRef, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  animationFrameScheduler,
  filter,
  finalize,
  fromEvent,
  map,
  scan,
  switchMap,
  takeUntil,
  throttleTime,
} from 'rxjs';
import { concatLatestFrom } from '@ngrx/operators';
import { Drawing } from '@team-up/board-commons';
import { DrawingStore } from './drawing.store';
import { output } from '@angular/core';
import { input } from '@angular/core';
import { injectResize } from 'ngxtension/resize';
import { getStroke } from 'perfect-freehand';

export interface MouseDrawingEvent {
  x: number;
  y: number;
  nX: number | null;
  nY: number | null;
  size: number;
  color: string;
}

@Directive({
  selector: '[teamUpDrawing]',
  standalone: true,
})
export class DrawingDirective {
  #drawingStore = inject(DrawingStore);
  #resize$ = injectResize();
  teamUpDrawing = input<Drawing[]>([]);

  canDraw = input(true);

  drawing = output<Drawing>();

  #context: CanvasRenderingContext2D;
  #elementRef = inject(ElementRef);
  #strokeEvents: Drawing | null = null;
  #dragEnabled = toObservable(this.#drawingStore.drawing);

  constructor() {
    this.#resize$.pipe(takeUntilDestroyed()).subscribe(() => {
      const paintCanvas = this.#elementRef.nativeElement;
      this.#context.clearRect(0, 0, paintCanvas.width, paintCanvas.height);

      this.teamUpDrawing().forEach((line) => {
        this.drawStroke(line);
      });
    });

    effect(() => {
      const paintCanvas = this.#elementRef.nativeElement;
      this.#context.clearRect(0, 0, paintCanvas.width, paintCanvas.height);

      this.teamUpDrawing().forEach((line) => {
        this.drawStroke(line);
      });
    });

    const paintCanvas = this.#elementRef.nativeElement;
    this.#context = paintCanvas.getContext('2d');

    const mouseUp$ = fromEvent(window, 'mouseup').pipe(map(() => false));

    const mouseMove$ = fromEvent<MouseEvent>(
      this.#elementRef.nativeElement,
      'mousemove',
    ).pipe(
      takeUntil(mouseUp$),
      throttleTime(0, animationFrameScheduler),
      concatLatestFrom(() => this.#dragEnabled),
      filter(([, dragEnabled]) => dragEnabled),
      map(([event]) => event),
      finalize(() => {
        if (this.#strokeEvents) {
          this.drawing.emit(this.#strokeEvents);
          this.#strokeEvents = null;
        }
      }),
    );

    const mouseDown$ = fromEvent<MouseEvent>(
      this.#elementRef.nativeElement,
      'mousedown',
    );

    mouseDown$
      .pipe(
        takeUntilDestroyed(),
        filter(() => this.canDraw()),
        switchMap(() => {
          return mouseMove$.pipe(
            scan(
              (acc, event) => {
                acc.points.push({ x: event.offsetX, y: event.offsetY });

                return acc;
              },
              {
                size: this.#drawingStore.size(),
                color: this.#drawingStore.color(),
                points: [],
              } as Drawing,
            ),
          );
        }),
      )
      .subscribe((event) => {
        this.#strokeEvents = event;

        const paintCanvas = this.#elementRef.nativeElement;
        this.#context.clearRect(0, 0, paintCanvas.width, paintCanvas.height);

        [...this.teamUpDrawing(), event].forEach((line) => {
          this.drawStroke(line);
        });
      });
  }

  #average = (a: number, b: number) => (a + b) / 2;

  #getPathFromStroke(points: number[][], closed = true) {
    const len = points.length;

    if (len < 4) {
      return '';
    }

    let a = points[0];
    let b = points[1];
    const c = points[2];

    let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
      2,
    )},${b[1].toFixed(2)} ${this.#average(b[0], c[0]).toFixed(2)},${this.#average(
      b[1],
      c[1],
    ).toFixed(2)} T`;

    for (let i = 2, max = len - 1; i < max; i++) {
      a = points[i];
      b = points[i + 1];
      result += `${this.#average(a[0], b[0]).toFixed(2)},${this.#average(
        a[1],
        b[1],
      ).toFixed(2)} `;
    }

    if (closed) {
      result += 'Z';
    }

    return result;
  }

  drawStroke(drawings: Drawing) {
    const stroke = getStroke(drawings.points, {
      size: drawings.size,
      thinning: 0,
    });

    const pathData = this.#getPathFromStroke(stroke);
    const myPath = new Path2D(pathData);

    this.#context.fillStyle = drawings.color;
    this.#context.fill(myPath);
  }
}
