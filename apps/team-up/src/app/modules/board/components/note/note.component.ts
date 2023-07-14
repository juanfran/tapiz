import { Point } from '@angular/cdk/drag-drop';
import {
  Component,
  ChangeDetectionStrategy,
  Input,
  HostListener,
  ElementRef,
  QueryList,
  ViewChildren,
  AfterViewInit,
  OnInit,
  HostBinding,
  ChangeDetectorRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { RxState } from '@rx-angular/state';
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { Drawing, Note, Panel, User } from '@team-up/board-commons';
import { BoardMoveService } from '../../services/board-move.service';
import {
  selectPanels,
  selectUserById,
  usernameById,
} from '../../selectors/board.selectors';
import {
  isUserHighlighted,
  selectDrawing,
  selectEmoji,
  selectFocusId,
  selectPopupOpen,
  selectUserId,
  selectVoting,
  selectZoom,
} from '../../selectors/page.selectors';
import { Observable } from 'rxjs';
import hotkeys from 'hotkeys-js';
import { lighter } from './contrast';
import { NativeEmoji } from 'emoji-picker-element/shared';
import { concatLatestFrom } from '@ngrx/effects';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { DrawingDirective } from '../../directives/drawing.directive';
import { pageFeature } from '../../reducers/page.reducer';
interface State {
  edit: boolean;
  note: Note;
  editText: string;
  focus: boolean;
  visible: boolean;
  highlight: boolean;
  username: string;
  userId: string;
  initDragPosition: Note['position'];
  initialText: string;
  voting: boolean;
  drawing: boolean;
  textSize: number;
}
@UntilDestroy()
@Component({
  selector: 'team-up-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, DrawingDirective],
})
export class NoteComponent implements AfterViewInit, OnInit, Draggable {
  @Input()
  public set note(note: Note) {
    this.state.set({
      note,
    });

    this.calculateTextSize();
  }

  @HostBinding('class.drawing') get drawing() {
    return this.state.get('drawing');
  }

  @HostBinding('class.focus') get focus() {
    return this.state.get('focus');
  }

  @HostBinding('class.visible') get visible() {
    return this.state.get('visible');
  }

  @HostBinding('class.highlight') get highlight() {
    return this.state.get('highlight');
  }

  public readonly viewModel$ = this.state.select();

  @ViewChildren('textarea') textarea!: QueryList<ElementRef>;

  constructor(
    private el: ElementRef,
    private boardMoveService: BoardMoveService,
    private state: RxState<State>,
    private store: Store,
    private boardDragDirective: BoardDragDirective,
    private cd: ChangeDetectorRef
  ) {
    this.state.set({
      textSize: 56,
      visible: true,
    });

    this.state
      .select('note')
      .pipe(first())
      .subscribe((note) => {
        this.state.connect(
          'username',
          this.store.select(usernameById(note.ownerId))
        );
      });

    this.state.connect('userId', this.store.select(selectUserId));
    this.state.connect('voting', this.store.select(selectVoting));
    this.state.connect('drawing', this.store.select(selectDrawing));
    this.state.hold(this.state.select('focus'), () => this.cd.markForCheck());
    this.state.hold(this.state.select('visible'), () => this.cd.markForCheck());
    this.state.hold(this.state.select('textSize'), () => {
      this.el.nativeElement.style.setProperty(
        '--text-size',
        `${this.state.get('textSize')}px`
      );
    });
  }

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
    // prevent select word on dblclick
    if (!this.state.get('edit')) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.state.get('voting')) {
      let votes = this.state.get('note').votes;

      if (event.button === 2) {
        votes--;
      } else {
        votes++;
      }

      if (votes >= 0) {
        this.store.dispatch(
          BoardActions.patchNode({
            nodeType: 'note',
            node: {
              id: this.state.get('note').id,
              votes,
            },
          })
        );
      }
    } else {
      this.store.dispatch(
        PageActions.setFocusId({
          focusId: this.state.get('note').id,
          ctrlKey: event.ctrlKey,
        })
      );
    }
  }

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
    if (this.state.get('drawing')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (this.isOwner() && !this.state.get('voting')) {
      this.edit();
      requestAnimationFrame(() => {
        this.focusTextarea();
      });
    }
  }

  @HostListener('click', ['$event'])
  public emoji(event: MouseEvent) {
    this.store
      .select(selectEmoji)
      .pipe(
        take(1),
        filter((it): it is NativeEmoji => !!it),
        concatLatestFrom(() => this.store.select(selectZoom))
      )
      .subscribe(([emoji, zoom]) => {
        const { width, height } = this.emojisSize();
        const targetPosition = this.nativeElement.getBoundingClientRect();
        this.store.dispatch(
          BoardActions.patchNode({
            nodeType: 'note',
            node: {
              id: this.state.get('note').id,
              emojis: [
                ...this.state.get('note').emojis,
                {
                  unicode: emoji.unicode,
                  position: {
                    x: (event.clientX - targetPosition.left) / zoom - width / 2,
                    y: (event.clientY - targetPosition.top) / zoom - height / 2,
                  },
                },
              ],
            },
          })
        );
      });
  }

  @HostListener('contextmenu', ['$event'])
  public removeEmoji(event: MouseEvent) {
    this.store
      .select(selectPopupOpen)
      .pipe(
        take(1),
        filter((it) => it === 'emoji'),
        switchMap(() => {
          return this.store.select(selectZoom);
        })
      )
      .subscribe((zoom) => {
        const targetPosition = this.nativeElement.getBoundingClientRect();
        const { width, height } = this.emojisSize();

        const clientX = (event.clientX - targetPosition.left) / zoom;
        const clientY = (event.clientY - targetPosition.top) / zoom;

        const emojis = this.state.get('note').emojis.filter((emoji) => {
          return !(
            clientX >= emoji.position.x &&
            clientX <= emoji.position.x + width &&
            clientY >= emoji.position.y &&
            clientY <= emoji.position.y + height
          );
        });

        this.store.dispatch(
          BoardActions.patchNode({
            nodeType: 'note',
            node: {
              id: this.state.get('note').id,
              emojis: [...emojis],
            },
          })
        );
      });
  }

  public emojisSize() {
    const styles = getComputedStyle(this.nativeElement);

    const width = Number(
      styles.getPropertyValue('--emoji-width').replace('px', '')
    );
    const height = Number(
      styles.getPropertyValue('--emoji-height').replace('px', '')
    );

    return { width, height };
  }

  public isOwner() {
    return this.state.get('userId') === this.state.get('note').ownerId;
  }

  public checkBgColor() {
    this.store
      .select(selectPanels)
      .pipe(untilDestroyed(this))
      .subscribe((panels) => {
        const position = this.state.get('note').position;

        this.findPanel(position, panels);
      });
  }

  public findPanel(position: Point, panels: Panel[]) {
    const insidePanel = panels.find((panel) => {
      return (
        position.x >= panel.position.x &&
        position.x < panel.position.x + panel.width &&
        position.y >= panel.position.y &&
        position.y < panel.position.y + panel.height
      );
    });

    const color = insidePanel?.color ?? '#fdab61';

    this.nativeElement.style.setProperty('--custom-fg', '#000');
    this.nativeElement.style.setProperty('--custom-bg', lighter(color, 70));
    this.nativeElement.style.setProperty('--custom-main', color);
  }

  public edit() {
    this.state.set({
      initialText: this.state.get('note').text,
      edit: true,
      editText: this.state.get('note').text,
    });

    this.state.connect(
      this.boardMoveService.mouseDown$.pipe(first()),
      (state) => {
        return {
          ...state,
          edit: false,
        };
      }
    );
  }

  public get position() {
    return this.state.get('note').position;
  }

  public get preventDrag() {
    return this.state.get('edit') || !this.state.get('focus');
  }

  public startDrag(position: Point) {
    this.state.set({
      initDragPosition: position,
    });
  }

  public endDrag() {
    this.store.dispatch(
      PageActions.endDragNode({
        nodeType: 'note',
        id: this.state.get('note').id,
        initialPosition: this.state.get('initDragPosition'),
        finalPosition: this.state.get('note').position,
      })
    );
  }

  public move(position: Point) {
    this.store.dispatch(
      BoardActions.patchNode({
        nodeType: 'note',
        node: {
          id: this.state.get('note').id,
          position,
        },
      })
    );
  }

  public setText(event: Event) {
    if (event.target) {
      const value = (event.target as HTMLTextAreaElement).value;

      this.store.dispatch(
        BoardActions.patchNode({
          nodeType: 'note',
          node: {
            id: this.state.get('note').id,
            text: value,
          },
        })
      );
    }
  }

  public selectTextarea($event: FocusEvent) {
    const target = $event.target as HTMLTextAreaElement;

    target.select();
  }

  public get nativeElement(): HTMLElement {
    return this.el.nativeElement as HTMLElement;
  }

  public ngOnInit() {
    this.checkBgColor();

    this.store
      .select(selectFocusId)
      .pipe(
        first(),
        withLatestFrom(
          this.store.select(pageFeature.selectAdditionalContext),
          this.state.select('note').pipe(map((note) => note.id))
        ),
        filter(([id, context, noteId]) => {
          return id.includes(noteId) && context[noteId] !== 'pasted';
        }),
        untilDestroyed(this)
      )
      .subscribe(() => {
        this.edit();
      });

    this.boardDragDirective.setHost(this);

    this.state
      .select('note')
      .pipe(untilDestroyed(this))
      .subscribe((note) => {
        this.nativeElement.style.transform = `translate(${note.position.x}px, ${note.position.y}px)`;
      });

    this.state.hold(
      this.state.select('note').pipe(
        map((note) => note.position),
        distinctUntilChanged(),
        concatLatestFrom(() => this.store.select(selectPanels))
      ),
      ([position, panels]) => {
        this.findPanel(position, panels);
      }
    );

    const user$: Observable<User> = this.store
      .select(selectUserById(this.state.get('note').ownerId))
      .pipe(filter((user): user is User => !!user));

    this.state.connect(
      'visible',
      user$.pipe(
        map((user) => {
          if (this.isOwner()) {
            return true;
          }

          return user.visible;
        })
      )
    );

    this.state.connect(this.store.select(selectFocusId), (state, focusId) => {
      return {
        focus: focusId.includes(state.note.id),
      };
    });

    this.state.connect(
      'highlight',
      this.store.select(isUserHighlighted(this.state.get('note').ownerId))
    );

    hotkeys('delete', () => {
      if (this.state.get('focus')) {
        this.store.dispatch(
          BoardActions.removeNode({
            node: this.state.get('note'),
            nodeType: 'note',
          })
        );
      }
    });
  }

  public focusTextarea() {
    if (this.textarea.first) {
      (this.textarea.first.nativeElement as HTMLTextAreaElement).focus();
    }
  }

  public setDrawing(newLine: Drawing[]) {
    this.store.dispatch(
      PageActions.setNoteDrawing({
        id: this.state.get('note').id,
        drawing: [...this.state.get('note').drawing, ...newLine],
      })
    );
  }

  public ngAfterViewInit() {
    if (this.state.get('focus')) {
      this.focusTextarea();
    }
  }

  public calculateTextSize() {
    const realSize = 250;

    const sizeSearch = (fontSize: number) => {
      const height = this.noteHeight(
        this.state.get('note').text,
        realSize,
        `${fontSize}px "Open Sans", -apple-system, system-ui, sans-serif`,
        1.1
      );

      if (height > realSize - 10) {
        sizeSearch(fontSize - 1);
      } else {
        this.state.set({ textSize: fontSize });
      }
    };

    sizeSearch(56);
  }

  private noteHeight(
    texto: string,
    width: number,
    font: string,
    lineHeight: number
  ) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return 0;

    ctx.font = font;

    const textLines = texto.split('\n');

    const nlines = textLines.reduce((prev, line) => {
      const error = 1.05;
      const measure = ctx.measureText(line).width * error;

      return prev + (Math.ceil(measure / width) || 1);
    }, 0);

    const realLineHeight = parseInt(font) * lineHeight;

    return nlines * realLineHeight;
  }
}
