import {
  AfterViewInit,
  ApplicationRef,
  Directive,
  ElementRef,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { animationFrameScheduler, fromEvent, merge } from 'rxjs';
import {
  filter,
  finalize,
  map,
  pairwise,
  startWith,
  switchMap,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Draggable } from '../models/draggable.model';
import {
  selectDragEnabled,
  selectPosition,
  selectZoom,
} from '../selectors/page.selectors';
import { Point } from '@team-up/board-commons';
import { concatLatestFrom } from '@ngrx/effects';

@UntilDestroy()
@Directive({
  selector: '[tuBoardDrag]',
  standalone: true,
})
export class BoardDragDirective implements AfterViewInit {
  public host?: Draggable;
  public initDragPosition: Point | null = null;
  private snap = 50;

  constructor(
    private el: ElementRef,
    private store: Store,
    private appRef: ApplicationRef
  ) {}

  public ngAfterViewInit() {
    this.listen();
  }

  public setHost(host: Draggable) {
    this.host = host;
  }

  public listen() {
    const keydown$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
      map(
        (event) => event.code === 'ControlLeft' || event.code === 'ControlRight'
      )
    );
    const keyup$ = fromEvent<KeyboardEvent>(document, 'keyup').pipe(
      map(
        (event) =>
          !(event.code === 'ControlLeft' || event.code === 'ControlRight')
      )
    );
    const controlPressed$ = merge(keydown$, keyup$).pipe(startWith(false));

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
      concatLatestFrom(() => this.store.select(selectDragEnabled)),
      filter(([, dragEnabled]) => dragEnabled),
      map(([event]) => event)
    );

    const mouseUp$ = fromEvent(window, 'mouseup').pipe(map(() => false));

    let startPositionDiff = { x: 0, y: 0 };

    const mouseMove$ = fromEvent<MouseEvent>(document.body, 'mousemove').pipe(
      throttleTime(0, animationFrameScheduler),
      map((mouseMove) => {
        // prevent select text on drag note
        mouseMove.preventDefault();

        return {
          x: mouseMove.clientX,
          y: mouseMove.clientY,
        };
      }),
      withLatestFrom(
        this.store.select(selectZoom),
        this.store.select(selectPosition)
      ),
      map(([move, zoom, position]) => {
        const posX = -position.x + move.x;
        const posY = -position.y + move.y;

        return {
          x: posX / zoom,
          y: posY / zoom,
        };
      })
    );

    const move$ = mouseDown$.pipe(
      withLatestFrom(
        this.store.select(selectZoom),
        this.store.select(selectPosition)
      ),
      switchMap(([event, zoom, position]) => {
        const initialPosition = this.host?.position ?? { x: 0, y: 0 };

        const posX = -position.x + event.clientX;
        const posY = -position.y + event.clientY;

        startPositionDiff = {
          x: posX / zoom - initialPosition.x,
          y: posY / zoom - initialPosition.y,
        };

        return mouseMove$.pipe(
          takeUntil(mouseUp$),
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

    move$
      .pipe(withLatestFrom(controlPressed$), untilDestroyed(this))
      .subscribe(([move, ctrlPressed]) => {
        if (this.host) {
          let finalPosition = {
            x: move.x - startPositionDiff.x,
            y: move.y - startPositionDiff.y,
          };

          if (ctrlPressed) {
            finalPosition = {
              x: Math.round(finalPosition.x / this.snap) * this.snap,
              y: Math.round(finalPosition.y / this.snap) * this.snap,
            };
          }

          this.host.move(finalPosition);
          this.appRef.tick();
        }
      });
  }

  public get nativeElement() {
    return this.el.nativeElement as HTMLElement;
  }
}
