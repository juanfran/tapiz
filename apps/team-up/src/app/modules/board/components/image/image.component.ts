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
import { Image, NodeType } from '@team-up/board-commons';
import { MoveService } from '../../services/move.service';
import {
  selectCanvasMode,
  selectFocusId,
} from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { RxPush } from '@rx-angular/template/push';

interface State {
  image: Image;
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
  providers: [RxState],
  standalone: true,
  imports: [RxPush],
})
export class ImageComponent implements OnInit, Draggable, AfterViewInit {
  @ViewChild('image') public imageRef!: ElementRef;

  @Input()
  public set image(image: Image) {
    this.state.set({ image });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('image')?.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('image')?.height ?? '0';
  }

  @HostBinding('class') get mode() {
    return this.state.get('mode');
  }

  public readonly image$ = this.state.select('image');

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
        focusId: this.state.get('image').id,
        ctrlKey: event.ctrlKey,
      })
    );
  }

  public loadImage() {
    const id = this.state.get('image').id;
    const width = this.state.get('image').width;
    const height = this.state.get('image').height;

    if (!width || !height) {
      this.store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'image',
                node: {
                  id,
                  width: this.imageNativeElement.naturalWidth,
                  height: this.imageNativeElement.naturalHeight,
                },
              },
              op: 'patch',
            },
          ],
        })
      );
    }
  }

  public get imageNativeElement() {
    return this.imageRef.nativeElement as HTMLImageElement;
  }

  public get position() {
    return this.state.get('image').position;
  }

  public get preventDrag() {
    return !this.state.get('draggable') || !this.state.get('focus');
  }

  public nodeType: NodeType = 'image';

  public get id() {
    return this.state.get('image').id;
  }

  public get nativeElement() {
    return this.el.nativeElement as HTMLElement;
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);

    this.state.connect('mode', this.store.select(selectCanvasMode));
    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.image.id),
      };
    });

    this.state.hold(this.state.select('mode'), () => this.cd.markForCheck());

    this.image$
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
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'image',
                  node: this.state.get('image'),
                },
                op: 'remove',
              },
            ],
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
            const { width, height } = this.state.get('image');

            this.store.dispatch(
              BoardActions.batchNodeActions({
                history: true,
                actions: [
                  {
                    data: {
                      type: 'image',
                      node: {
                        id: this.state.get('image').id,
                        width: width + size.x,
                        height: height + size.y,
                      },
                    },
                    op: 'patch',
                  },
                ],
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
