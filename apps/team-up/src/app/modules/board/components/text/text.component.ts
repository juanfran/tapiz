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
import { map, skip, take } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { Text } from '@team-up/board-commons';
import { MoveService } from '../../services/move.service';
import { selectFocusId } from '../../selectors/page.selectors';
import hotkeys from 'hotkeys-js';
import { BoardMoveService } from '../../services/board-move.service';

interface State {
  node: Text;
  draggable: boolean;
  focus: boolean;
  edit: boolean;
  editText: string;
}
@UntilDestroy()
@Component({
  selector: 'team-up-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class TextComponent implements OnInit, Draggable, AfterViewInit {
  @Input()
  public set text(node: Text) {
    this.state.set({ node });
  }

  @HostBinding('style.width.px') get width() {
    return this.state.get('node')?.width ?? '0';
  }

  @HostBinding('style.height.px') get height() {
    return this.state.get('node')?.height ?? '0';
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  public readonly viewModel$ = this.state.select().pipe(
    map((state) => {
      return {
        toolbar: state.focus && !state.edit,
        ...state,
      };
    })
  );

  @ViewChild('textarea') textarea!: ElementRef;

  @ViewChild('resize') resize!: ElementRef;

  public plugins = [
    'advlist',
    'autolink',
    'lists',
    'link',
    'charmap',
    'anchor',
    'visualblocks',
    'code',
  ];

  public toolbar = [
    `bold italic | fontsize |
    alignleft aligncenter alignright alignjustify |
    bullist numlist outdent indent`,
  ];

  constructor(
    private el: ElementRef,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private boardMoveService: BoardMoveService,
    private moveService: MoveService,
    private appRef: ApplicationRef
  ) {
    this.state.set({ draggable: true, edit: false });
  }

  @HostListener('mousedown')
  public mousedown() {
    this.store.dispatch(
      PageActions.setFocusId({ focusId: this.state.get('node').id })
    );
  }

  public get position() {
    return this.state.get('node').position;
  }

  public get preventDrag() {
    return !this.state.get('draggable');
  }

  public dblclick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.edit();
    requestAnimationFrame(() => {
      this.focusTextarea();
    });
  }

  public edit() {
    this.state.set({
      edit: true,
      editText: this.state.get('node').text,
    });

    this.state.connect(
      this.boardMoveService.mouseDown$.pipe(take(1)),
      (state) => {
        const value = (this.textarea.nativeElement as HTMLElement).innerText;

        this.store.dispatch(
          BoardActions.patchNode({
            nodeType: 'text',
            node: {
              id: this.state.get('node').id,
              text: value.trim(),
            },
          })
        );

        return {
          ...state,
          edit: false,
        };
      }
    );
  }

  public focusTextarea() {
    (this.textarea.nativeElement as HTMLTextAreaElement).focus();
  }

  public selectElementContents(el: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  public selectTextarea($event: FocusEvent) {
    this.selectElementContents($event.target as HTMLElement);
  }

  public startDrag(position: Point) {}

  public endDrag() {}

  public newColor(e: Event) {
    if (e.target) {
      const color = (e.target as HTMLInputElement).value;

      this.store.dispatch(
        BoardActions.patchNode({
          nodeType: 'text',
          node: {
            id: this.state.get('node').id,
            color,
          },
        })
      );
    }
  }

  public newSize(e: Event) {
    if (e.target) {
      const size = Number((e.target as HTMLInputElement).value);

      this.store.dispatch(
        BoardActions.patchNode({
          nodeType: 'text',
          node: {
            id: this.state.get('node').id,
            size,
          },
        })
      );
    }
  }

  public move(position: Point) {
    (document.activeElement as HTMLElement)?.blur();

    this.store.dispatch(
      BoardActions.patchNode({
        nodeType: 'text',
        node: {
          id: this.state.get('node').id,
          position,
        },
      })
    );
  }

  public ngOnInit() {
    this.boardDragDirective.setHost(this);

    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId === state.node.id,
      };
    });

    this.state
      .select('node')
      .pipe(
        map((it) => it.position),
        untilDestroyed(this)
      )
      .subscribe((position) => {
        (
          this.el.nativeElement as HTMLElement
        ).style.transform = `translate(${position.x}px, ${position.y}px)`;
      });

    this.state.hold(this.state.select('focus').pipe(skip(1)), (focus) => {
      if (focus) {
        hotkeys('delete', this.state.get('node').id, () => {
          this.store.dispatch(
            BoardActions.removeNode({
              node: this.state.get('node'),
              nodeType: 'text',
            })
          );
        });

        hotkeys.setScope(this.state.get('node').id);
      } else {
        (document.activeElement as HTMLElement)?.blur();
        hotkeys.unbind('delete', this.state.get('node').id);
      }
    });

    this.state.hold(this.state.select('node'), (node) => {
      this.el.nativeElement.style.setProperty('--size', `${node.size}px`);
      this.el.nativeElement.style.setProperty('--color', node.color);
    });
  }

  public ngAfterViewInit(): void {
    if (this.resize) {
      this.moveService
        .listenIncrementalAreaSelector(this.resize.nativeElement)
        .subscribe((size) => {
          if (size) {
            const { width, height } = this.state.get('node');
            const newWidth = width + size.x;
            const newHeight = height + size.y;

            if (newWidth >= 50 && newHeight >= 20)
              this.store.dispatch(
                BoardActions.patchNode({
                  nodeType: 'text',
                  node: {
                    id: this.state.get('node').id,
                    width: newWidth,
                    height: newHeight,
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
