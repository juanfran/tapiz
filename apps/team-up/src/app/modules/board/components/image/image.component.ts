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
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import { map, pluck } from 'rxjs/operators';
import { patchNode, removeNode, setFocusId } from '../../actions/board.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { Image } from '@team-up/board-commons';
import { MoveService } from '../../services/move.service';
import { selectFocusId } from '../../selectors/board.selectors';
import hotkeys from 'hotkeys-js';

interface State {
  image: Image;
  draggable: boolean;
  focus: boolean;
}
@UntilDestroy()
@Component({
  selector: 'team-up-image',
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
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

  public readonly image$ = this.state.select('image');

  @ViewChild('resize') resize!: ElementRef;

  constructor(
    private el: ElementRef,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private moveService: MoveService,
    private appRef: ApplicationRef
  ) {
    this.state.set({ draggable: true });
  }

  @HostListener('mousedown')
  public mousedown() {
    this.store.dispatch(setFocusId({ focusId: this.state.get('image').id }));
  }

  public loadImage() {
    const id = this.state.get('image').id;
    const width = this.state.get('image').width;
    const height = this.state.get('image').height;

    if (!width || !height) {
      this.store.dispatch(
        patchNode({
          nodeType: 'images',
          node: {
            id,
            width: this.imageNativeElement.naturalWidth,
            height: this.imageNativeElement.naturalHeight,
          },
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
    return !this.state.get('draggable');
  }

  public startDrag(position: Point) {}

  public endDrag() {}

  public move(position: Point) {
    this.store.dispatch(
      patchNode({
        nodeType: 'images',
        node: {
          id: this.state.get('image').id,
          position,
        },
      })
    );
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);

    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId === state.image.id,
      };
    });

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

    this.state.hold(this.state.select('focus'), (focus) => {
      if (focus) {
        hotkeys('delete', this.state.get('image').id, () => {
          this.store.dispatch(
            removeNode({ node: this.state.get('image'), nodeType: 'image' })
          );
        });

        hotkeys.setScope(this.state.get('image').id);
      } else {
        hotkeys.unbind('delete', this.state.get('image').id);
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
              patchNode({
                nodeType: 'images',
                node: {
                  id: this.state.get('image').id,
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
