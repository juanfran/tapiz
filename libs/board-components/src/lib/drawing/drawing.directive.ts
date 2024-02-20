import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  effect,
  inject,
  signal,
} from '@angular/core';
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
import { concatLatestFrom } from '@ngrx/effects';
import { Drawing } from '@team-up/board-commons';
import { DrawingStore } from './drawing.store';

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
  #drawing = signal([] as Drawing[]);

  @Input() set teamUpDrawing(drawing: Drawing[]) {
    this.#drawing.set(drawing);
  }

  @Input()
  public canDraw = true;

  @Output() drawing = new EventEmitter<Drawing[]>();

  private context: CanvasRenderingContext2D;
  private elementRef = inject(ElementRef);
  private drawingEvents: Drawing[] = [];
  private dragEnabled = toObservable(this.#drawingStore.drawing);

  constructor() {
    effect(() => {
      const paintCanvas = this.elementRef.nativeElement;
      this.context.clearRect(0, 0, paintCanvas.width, paintCanvas.height);

      this.#drawing().forEach((line) => {
        this.drawLine(line);
      });
    });

    const paintCanvas = this.elementRef.nativeElement;
    this.context = paintCanvas.getContext('2d');
    this.context.lineCap = 'round';

    this.context.lineWidth = this.#drawingStore.size();
    this.context.strokeStyle = this.#drawingStore.color();

    const mouseUp$ = fromEvent(window, 'mouseup').pipe(map(() => false));

    const mouseMove$ = fromEvent<MouseEvent>(
      this.elementRef.nativeElement,
      'mousemove',
    ).pipe(
      takeUntil(mouseUp$),
      throttleTime(0, animationFrameScheduler),
      concatLatestFrom(() => this.dragEnabled),
      filter(([, dragEnabled]) => dragEnabled),
      map(([event]) => event),
      finalize(() => {
        if (this.drawingEvents.length) {
          this.drawing.emit(this.drawingEvents);
          this.drawingEvents = [];
        }
      }),
    );

    const mouseDown$ = fromEvent<MouseEvent>(
      this.elementRef.nativeElement,
      'mousedown',
    );

    mouseDown$
      .pipe(
        takeUntilDestroyed(),
        filter(() => this.canDraw),
        switchMap(() => {
          return mouseMove$.pipe(
            scan(
              (acc, event) => {
                return {
                  x: acc.nX ?? event.offsetX,
                  y: acc.nY ?? event.offsetY,
                  nX: event.offsetX,
                  nY: event.offsetY,
                  size: this.#drawingStore.size(),
                  color: this.#drawingStore.color(),
                } as MouseDrawingEvent;
              },
              { nX: null, nY: null, x: 0, y: 0 } as MouseDrawingEvent,
            ),
          );
        }),
      )
      .subscribe((event: MouseDrawingEvent) => {
        if (event.nX !== null && event.nY !== null) {
          this.drawingEvents.push(event as Drawing);
          this.drawLine(event as Drawing);
        }
      });
  }

  public drawLine(event: Drawing) {
    this.context.lineWidth = event.size ?? this.#drawingStore.size();
    this.context.strokeStyle = event.color ?? this.#drawingStore.color();

    this.context.beginPath();
    this.context.moveTo(event.x, event.y);
    this.context.lineTo(event.nX, event.nY);
    this.context.stroke();
  }
}
