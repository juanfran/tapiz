import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
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
import {
  selectDrawing,
  selectDrawingColor,
  selectDrawingSize,
} from '../selectors/page.selectors';
import { concatLatestFrom } from '@ngrx/effects';
import { Drawing } from '@team-up/board-commons';

export interface MouseDrawingEvent {
  x: number;
  y: number;
  nX: number | null;
  nY: number | null;
  size: number;
  color: string;
}

@Directive({
  selector: '[tuDrawing]',
  standalone: true,
})
export class DrawingDirective {
  @Input() set tuDrawing(drawing: Drawing[]) {
    const paintCanvas = this.elementRef.nativeElement;

    this.context.clearRect(0, 0, paintCanvas.width, paintCanvas.height);

    drawing.forEach((line) => {
      this.drawLine(line);
    });
  }

  @Input()
  public canDraw = true;

  @Output() drawing = new EventEmitter<Drawing[]>();

  private context: CanvasRenderingContext2D;
  private store = inject(Store);
  private elementRef = inject(ElementRef);
  private drawingEvents: Drawing[] = [];
  private color = this.store.selectSignal(selectDrawingColor);
  private size = this.store.selectSignal(selectDrawingSize);

  constructor() {
    const paintCanvas = this.elementRef.nativeElement;
    this.context = paintCanvas.getContext('2d');
    this.context.lineCap = 'round';

    this.context.lineWidth = this.size();
    this.context.strokeStyle = this.color();

    const mouseUp$ = fromEvent(window, 'mouseup').pipe(map(() => false));

    const mouseMove$ = fromEvent<MouseEvent>(
      this.elementRef.nativeElement,
      'mousemove'
    ).pipe(
      takeUntil(mouseUp$),
      throttleTime(0, animationFrameScheduler),
      concatLatestFrom(() => this.store.select(selectDrawing)),
      filter(([, dragEnabled]) => dragEnabled),
      map(([event]) => event),
      finalize(() => {
        if (this.drawingEvents.length) {
          this.drawing.emit(this.drawingEvents);
          this.drawingEvents = [];
        }
      })
    );

    const mouseDown$ = fromEvent<MouseEvent>(
      this.elementRef.nativeElement,
      'mousedown'
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
                  size: this.size(),
                  color: this.color(),
                } as MouseDrawingEvent;
              },
              { nX: null, nY: null, x: 0, y: 0 } as MouseDrawingEvent
            )
          );
        })
      )
      .subscribe((event: MouseDrawingEvent) => {
        if (event.nX !== null && event.nY !== null) {
          this.drawingEvents.push(event as Drawing);
          this.drawLine(event as Drawing);
        }
      });
  }

  public drawLine(event: Drawing) {
    this.context.lineWidth = event.size ?? this.size();
    this.context.strokeStyle = event.color ?? this.color();

    this.context.beginPath();
    this.context.moveTo(event.x, event.y);
    this.context.lineTo(event.nX, event.nY);
    this.context.stroke();
  }
}
