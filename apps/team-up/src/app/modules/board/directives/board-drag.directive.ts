import {
  AfterViewInit,
  ApplicationRef,
  Directive,
  ElementRef,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { animationFrameScheduler, fromEvent } from 'rxjs';
import {
  filter,
  finalize,
  map,
  pairwise,
  switchMap,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Draggable } from '../models/draggable.model';
import { selectZoom } from '../selectors/page.selectors';
import { Point } from '@team-up/board-commons';

@UntilDestroy()
@Directive({
  selector: '[tuBoardDrag]',
  standalone: true,
})
export class BoardDragDirective implements AfterViewInit {
  public host?: Draggable;
  public initDragPosition: Point | null = null;

  constructor(
    private el: ElementRef,
    private store: Store,
    private appRef: ApplicationRef
  ) {}

  public ngAfterViewInit() {
    const initialPosition = this.host?.position
      ? this.host.position
      : { x: 0, y: 0 };
    this.listen(initialPosition);
  }

  public setHost(host: Draggable) {
    this.host = host;
  }

  public listen(initialPosition: Point) {
    const mouseDown$ = fromEvent<MouseEvent>(
      this.el.nativeElement,
      'mousedown'
    ).pipe(
      filter((e) => {
        if ((e.target as HTMLElement).classList.contains('no-drag')) {
          return false;
        }

        if (this.host) {
          return !this.host.preventDrag;
        }

        return true;
      }),
      map(() => true)
    );

    const mouseUp$ = fromEvent(window, 'mouseup').pipe(map(() => false));

    const mouseMove$ = fromEvent<MouseEvent>(document.body, 'mousemove').pipe(
      throttleTime(0, animationFrameScheduler),
      map((mouseMove) => {
        // prevent select text on drag note
        mouseMove.preventDefault();

        return {
          clientX: mouseMove.clientX,
          clientY: mouseMove.clientY,
        };
      }),
      pairwise(),
      map(([mouseMovePrev, mouseMoveCurr]) => {
        return {
          x: mouseMovePrev.clientX - mouseMoveCurr.clientX,
          y: mouseMovePrev.clientY - mouseMoveCurr.clientY,
        };
      }),
      withLatestFrom(this.store.select(selectZoom)),
      map(([move, zoom]) => {
        return {
          x: move.x / zoom,
          y: move.y / zoom,
        };
      })
    );

    const move$ = mouseDown$.pipe(
      switchMap(() => {
        return mouseMove$.pipe(
          takeUntil(mouseUp$),
          map((move) => {
            const previousPosition = this.host?.position ?? initialPosition;
            return {
              x: previousPosition.x - move.x,
              y: previousPosition.y - move.y,
            };
          }),
          tap((initialPosition) => {
            if (!this.initDragPosition) {
              this.initDragPosition = initialPosition;
              this.host?.startDrag(initialPosition);
            }
          }),
          finalize(() => {
            this.initDragPosition = null;
            this.host?.endDrag();
          })
        );
      })
    );

    move$.pipe(untilDestroyed(this)).subscribe((move) => {
      // TODO: performance?
      // this.nativeElement.style.transform = `translate(${move.x}px, ${move.y}px)`;
      if (this.host) {
        this.host.move(move);
        this.appRef.tick();
      }
    });
  }

  public get nativeElement() {
    return this.el.nativeElement as HTMLElement;
  }
}
