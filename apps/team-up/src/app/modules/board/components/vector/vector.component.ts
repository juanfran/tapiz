import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ElementRef,
  OnInit,
  HostBinding,
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
import { Draggable } from '@team-up/cdk/models/draggable.model';
import { TuNode, Vector } from '@team-up/board-commons';
import {
  selectCanvasMode,
  selectFocusId,
} from '../../selectors/page.selectors';
import { RxPush } from '@rx-angular/template/push';
import { Resizable } from '../../models/resizable.model';
import { ResizeHandlerComponent } from '../resize-handler/resize-handler.component';
import { ResizableDirective } from '../../directives/resize.directive';
import { MatIconModule } from '@angular/material/icon';
import { RotateHandlerDirective } from '../../directives/rotate-handler.directive';
import { RotateDirective } from '../../directives/rotate.directive';
import { compose, rotateDEG, translate, toCSS } from 'transformation-matrix';
import { Rotatable } from '../../models/rotatable.model';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';

interface State {
  vector: TuNode<Vector>;
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
  providers: [RxState, HotkeysService],
  standalone: true,
  imports: [
    RxPush,
    ResizeHandlerComponent,
    RotateHandlerDirective,
    MatIconModule,
  ],
})
export class VectorComponent
  implements OnInit, Draggable, Resizable, Rotatable
{
  @Input()
  public set vector(vector: TuNode<Vector>) {
    this.state.set({ vector });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('vector')?.content.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('vector')?.content.height ?? '0';
  }

  @HostBinding('class') get mode() {
    return this.state.get('mode');
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  public readonly vector$ = this.state.select('vector');

  public nodeType = 'vector';

  public get id() {
    return this.state.get('vector').id;
  }

  public get nativeElement() {
    return this.el.nativeElement as HTMLElement;
  }

  constructor(
    private el: ElementRef,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private resizableDirective: ResizableDirective,
    private rotateDirective: RotateDirective,
    private cd: ChangeDetectorRef,
    private hotkeysService: HotkeysService,
  ) {
    this.state.set({ draggable: true });
  }

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    this.store.dispatch(
      PageActions.setFocusId({
        focusId: this.state.get('vector').id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  public get position() {
    return this.state.get('vector').content.position;
  }

  public get rotation() {
    return this.state.get('vector').content.rotation;
  }

  public get preventDrag() {
    return !this.state.get('draggable') || !this.state.get('focus');
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);
    this.resizableDirective.setHost(this);
    this.rotateDirective.setHost(this);

    this.state.connect('mode', this.store.select(selectCanvasMode));
    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.vector.id),
      };
    });

    this.state.hold(this.state.select('mode'), () => this.cd.markForCheck());

    this.vector$
      .pipe(
        map((it) => {
          return {
            position: it.content.position,
            rotation: it.content.rotation,
          };
        }),
        untilDestroyed(this),
      )
      .subscribe(({ position, rotation }) => {
        this.nativeElement.style.transform = toCSS(
          compose(translate(position.x, position.y), rotateDEG(rotation)),
        );
      });

    this.hotkeysService.listen({ key: 'Delete' }).subscribe(() => {
      if (this.state.get('focus')) {
        this.store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: this.state.get('vector'),
                op: 'remove',
              },
            ],
          }),
        );
      }
    });
  }
}
