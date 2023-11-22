import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ElementRef,
  OnInit,
  ViewChild,
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
import { Image, TuNode } from '@team-up/board-commons';
import {
  selectCanvasMode,
  selectFocusId,
} from '../../selectors/page.selectors';
import { RxPush } from '@rx-angular/template/push';
import { Resizable } from '../../models/resizable.model';
import { ResizableDirective } from '../../directives/resize.directive';
import { ResizeHandlerComponent } from '../resize-handler/resize-handler.component';
import { MatIconModule } from '@angular/material/icon';
import { RotateHandlerDirective } from '../../directives/rotate-handler.directive';
import { RotateDirective } from '../../directives/rotate.directive';
import { compose, rotateDEG, translate, toCSS } from 'transformation-matrix';
import { Rotatable } from '../../models/rotatable.model';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';

interface State {
  image: TuNode<Image>;
  draggable: boolean;
  focus: boolean;
  mode: string;
}
@UntilDestroy()
@Component({
  selector: 'team-up-image',
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.scss'],
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
export class ImageComponent implements OnInit, Draggable, Resizable, Rotatable {
  @ViewChild('image') public imageRef!: ElementRef;

  @Input()
  public set image(image: TuNode<Image>) {
    this.state.set({ image });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('image')?.content.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('image')?.content.height ?? '0';
  }

  @HostBinding('class') get mode() {
    return (
      this.state.get('mode') +
      ' ' +
      `layer-${this.state.get('image').content.layer}`
    );
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  public readonly image$ = this.state.select('image');

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
        focusId: this.state.get('image').id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  public loadImage() {
    const id = this.state.get('image').id;
    const width = this.state.get('image').content.width;
    const height = this.state.get('image').content.height;

    if (!width || !height) {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'image',
                id,
                content: {
                  width: this.imageNativeElement.naturalWidth,
                  height: this.imageNativeElement.naturalHeight,
                },
              },
              op: 'patch',
            },
          ],
        }),
      );
    }
  }

  public get imageNativeElement() {
    return this.imageRef.nativeElement as HTMLImageElement;
  }

  public get position() {
    return this.state.get('image').content.position;
  }

  public get rotation() {
    return this.state.get('image').content.rotation;
  }

  public get preventDrag() {
    return !this.state.get('draggable') || !this.state.get('focus');
  }

  public nodeType = 'image';

  public get id() {
    return this.state.get('image').id;
  }

  public get nativeElement() {
    return this.el.nativeElement as HTMLElement;
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);
    this.resizableDirective.setHost(this);
    this.rotateDirective.setHost(this);

    this.state.connect('mode', this.store.select(selectCanvasMode));
    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.image.id),
      };
    });

    this.state.hold(this.state.select('mode'), () => this.cd.markForCheck());

    this.image$
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
                data: {
                  type: 'image',
                  id: this.state.get('image').id,
                },
                op: 'remove',
              },
            ],
          }),
        );
      }
    });
  }
}
