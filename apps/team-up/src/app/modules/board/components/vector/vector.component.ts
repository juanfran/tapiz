import { Point } from '@angular/cdk/drag-drop';
import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ElementRef,
  OnInit,
  ViewChild,
  HostBinding,
  AfterViewInit,
  ApplicationRef,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { map } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { Vector } from '@team-up/board-commons';
import { MoveService } from '../../services/move.service';
import {
  selectCanvasMode,
  selectFocusId,
} from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { PushPipe } from '@rx-angular/template/push';

interface State {
  vector: Vector;
  draggable: boolean;
  focus: boolean;
  mode: string;
}
@UntilDestroy()
@Component({
  selector: 'team-up-vector',
  templateUrl: './vector.component.html',
  styleUrls: ['./vector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [PushPipe],
})
export class VectorComponent implements OnInit, Draggable, AfterViewInit {
  @ViewChild('vector') public imageRef!: ElementRef;

  @Input()
  public set vector(vector: Vector) {
    this.state.set({ vector });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('vector')?.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('vector')?.height ?? '0';
  }

  @HostBinding('class') get mode() {
    return this.state.get('mode');
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  public readonly vector$ = this.state.select('vector');

  @ViewChild('resize') resize!: ElementRef;

  constructor(
    private el: ElementRef,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private moveService: MoveService,
    private appRef: ApplicationRef,
    private cd: ChangeDetectorRef
  ) {
    this.state.set({ draggable: true });
  }

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('vector').id,
        ctrlKey: event.ctrlKey,
      })
    );
  }

  public get position() {
    return this.state.get('vector').position;
  }

  public get preventDrag() {
    return !this.state.get('draggable') || !this.state.get('focus');
  }

  public startDrag(position: Point) {}

  public endDrag() {}

  public move(position: Point) {
    this.store.dispatch(
      BoardActions.patchNode({
        nodeType: 'vector',
        node: {
          id: this.state.get('vector').id,
          position,
        },
      })
    );
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);

    this.state.connect('mode', this.store.select(selectCanvasMode));
    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.vector.id),
      };
    });

    this.state.hold(this.state.select('mode'), () => this.cd.markForCheck());

    this.vector$
      .pipe(
        map((it) => it.position),
        untilDestroyed(this)
      )
      .subscribe((position) => {
        (
          this.el.nativeElement as HTMLElement
        ).style.transform = `translate(${position.x}px, ${position.y}px)`;
      });

    hotkeys('delete', () => {
      if (this.state.get('focus')) {
        this.store.dispatch(
          BoardActions.removeNode({
            node: this.state.get('vector'),
            nodeType: 'vector',
          })
        );
      }
    });
  }

  public ngAfterViewInit(): void {
    if (this.resize) {
      this.moveService
        .listenIncrementalAreaSelector(this.resize.nativeElement)
        .subscribe((size) => {
          if (size) {
            const { width, height } = this.state.get('vector');

            this.store.dispatch(
              BoardActions.patchNode({
                nodeType: 'vector',
                node: {
                  id: this.state.get('vector').id,
                  width: width + size.x,
                  height: height + size.y,
                },
              })
            );

            this.appRef.tick();
          } else {
            this.state.set({ draggable: true });
          }
        });
    }
  }
}
