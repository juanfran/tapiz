import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostBinding,
  HostListener,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { fabric } from 'fabric';
import { animationFrameScheduler, combineLatest, fromEvent, merge } from 'rxjs';
import {
  filter,
  first,
  map,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { v4 } from 'uuid';
import { newPath, wsSetState } from '../../actions/board.actions';
import {
  selectPosition,
  selectZoom,
  selectBrushSize,
  selectBrushColor,
  selectDrawEnabled,
  selectCanvasActive,
} from '../../selectors/board.selectors';

@UntilDestroy()
@Component({
  selector: 'team-up-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class CanvasComponent implements AfterViewInit {
  public readonly window$ = this.state.select('window');

  @ViewChild('canvas', { read: ElementRef }) public canvasEl!: ElementRef;

  public canvas!: fabric.Canvas;

  @HostBinding('class.active') public get isActive() {
    return this.state.get('active');
  }

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
    this.addText(event.clientX, event.clientY);
  }

  constructor(
    private actions$: Actions,
    private store: Store,
    private state: RxState<{
      active: boolean;
      window: {
        width: number;
        height: number;
      };
    }>
  ) {}

  get canvasNativeElement() {
    return this.canvasEl.nativeElement as HTMLCanvasElement;
  }

  public refreshWindowSize() {
    this.state.set({
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
  }

  public addText(x: number, y: number) {
    combineLatest([
      this.store.select(selectZoom),
      this.store.select(selectPosition),
    ])
      .pipe(first())
      .subscribe(([zoom, position]) => {
        const text = new fabric.IText('', {
          left: (-position.x + x) / zoom,
          top: (-position.y + y) / zoom,
          fontFamily: 'Ubuntu',
          fill: '#333',
          id: v4(),
        } as any);

        this.canvas.add(text);

        this.canvas.setActiveObject(text);
        text.enterEditing();
        text.hiddenTextarea?.focus();
      });
  }

  public initCanvas() {
    this.canvas = new fabric.Canvas(this.canvasNativeElement);
    this.canvas.freeDrawingBrush.width = 12;

    this.canvas.on('object:added', (event) => {
      // todo
      // const target: any = event.target;
      // console.log(target.toJSON(['id']));
      // this.store.dispatch(newPath(JSON.parse(JSON.stringify({target}))));
    });

    this.canvas.on('path:created', (event) => {
      const path = (event as fabric.IPathOptions).path;
      if (path) {
        this.store.dispatch(newPath(JSON.parse(JSON.stringify({ path }))));
      }
    });

    const addPath$ = this.actions$.pipe(
      ofType(wsSetState),
      filter((action) => !!action.data.add?.paths),
      map((action) => action.data.add?.paths)
    );

    const setPath$ = this.actions$.pipe(
      ofType(wsSetState),
      filter((action) => !!action.data.set?.paths),
      map((action) => action.data.set?.paths)
    );

    merge(addPath$, setPath$)
      .pipe(untilDestroyed(this))
      .subscribe((paths) => {
        if (paths) {
          fabric.util.enlivenObjects(
            paths,
            (objects: fabric.Object[]) => {
              objects.forEach((o) => {
                this.canvas.add(o);
              });
            },
            ''
          );
        }
      });

    this.store
      .select(selectPosition)
      .pipe(untilDestroyed(this))
      .subscribe((position) => {
        const vpt = this.canvas.viewportTransform;

        if (vpt) {
          vpt[4] = position.x;
          vpt[5] = position.y;
          this.canvas.requestRenderAll();
        }
      });

    this.store
      .select(selectCanvasActive)
      .pipe(untilDestroyed(this))
      .subscribe((active) => {
        this.canvas.isDrawingMode = false;

        this.state.set({
          active,
        });
      });

    this.store
      .select(selectDrawEnabled)
      .pipe(untilDestroyed(this))
      .subscribe((drawEnabled) => {
        this.canvas.isDrawingMode = drawEnabled;

        this.state.set({
          active: drawEnabled,
        });
      });

    this.store
      .select(selectBrushSize)
      .pipe(untilDestroyed(this))
      .subscribe((size) => {
        this.canvas.freeDrawingBrush.width = size;
      });

    this.store
      .select(selectBrushColor)
      .pipe(untilDestroyed(this))
      .subscribe((color) => {
        this.canvas.freeDrawingBrush.color = color;
      });

    this.store
      .select(selectZoom)
      .pipe(
        untilDestroyed(this),
        withLatestFrom(this.store.select(selectPosition))
      )
      .subscribe(([zoom, position]) => {
        this.canvas.zoomToPoint(
          { x: position.x, y: position.y } as fabric.Point,
          zoom
        );
      });
  }

  public ngAfterViewInit() {
    this.initCanvas();
    this.refreshWindowSize();

    this.window$
      .pipe(throttleTime(0, animationFrameScheduler), untilDestroyed(this))
      .subscribe(() => {
        requestAnimationFrame(() => {
          this.canvas.setHeight(window.innerHeight);
          this.canvas.setWidth(window.innerWidth);
          this.canvas.calcOffset();
        });
      });

    fromEvent(window, 'resize')
      .pipe(untilDestroyed(this))
      .subscribe(() => {
        this.refreshWindowSize();
      });
  }
}
