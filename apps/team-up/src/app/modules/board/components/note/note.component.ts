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
import { filter, first, map, take } from 'rxjs/operators';
import { BoardActions } from '../../actions/board.actions';
import { PageActions } from '../../actions/page.actions';
import { BoardDragDirective } from '../../directives/board-drag.directive';
import { Draggable } from '../../models/draggable.model';
import { Note, Panel, User } from '@team-up/board-commons';
import { BoardMoveService } from '../../services/board-move.service';
import {
  selectPanels,
  selectUserById,
  usernameById,
} from '../../selectors/board.selectors';
import {
  isUserHighlighted,
  selectEmoji,
  selectFocusId,
  selectUserId,
  selectVoting,
  selectZoom,
} from '../../selectors/page.selectors';
import { Observable } from 'rxjs';
import hotkeys from 'hotkeys-js';
import { contrast } from './contrast';
import { NativeEmoji } from 'emoji-picker-element/shared';
import { concatLatestFrom } from '@ngrx/effects';
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
  customBg: boolean;
  voting: boolean;
}
@UntilDestroy()
@Component({
  selector: 'team-up-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class NoteComponent implements AfterViewInit, OnInit, Draggable {
  @Input()
  public set note(note: Note) {
    this.state.set({ note });
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

  @HostBinding('class.custom-bg') get customBg() {
    return this.state.get('customBg');
  }

  @HostBinding('class.size1') get size1() {
    return this.state.get('note').text.length <= 30;
  }

  @HostBinding('class.size2') get size2() {
    const length = this.state.get('note').text.length;
    return length > 30 && length <= 40;
  }

  @HostBinding('class.size3') get size3() {
    const length = this.state.get('note').text.length;
    return length > 40 && length <= 55;
  }

  @HostBinding('class.size4') get size4() {
    const length = this.state.get('note').text.length;
    return length > 40 && length <= 100;
  }

  @HostBinding('class.size5') get size5() {
    const length = this.state.get('note').text.length;
    return length > 100;
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
    this.state.hold(this.state.select('focus'), () => this.cd.markForCheck());
    this.state.hold(this.state.select('visible'), () => this.cd.markForCheck());
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
        PageActions.setFocusId({ focusId: this.state.get('note').id })
      );
    }
  }

  @HostListener('dblclick', ['$event'])
  public dblclick(event: MouseEvent) {
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
                    x: (event.clientX - targetPosition.left) / zoom - 27 / 2,
                    y: (event.clientY - targetPosition.top) / zoom - 27 / 2,
                  },
                },
              ],
            },
          })
        );
      });
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

    if (insidePanel?.color && insidePanel.color !== '#fdfcdc') {
      const contrast1 = contrast('#ffffff', insidePanel?.color);
      const contrast2 = contrast('#000000', insidePanel?.color);

      if (contrast1 > contrast2) {
        this.nativeElement.style.setProperty('--custom-fg', '#fff');
      } else {
        this.nativeElement.style.setProperty('--custom-fg', '#000');
      }

      this.state.set({ customBg: true });
      this.nativeElement.style.setProperty('--custom-bg', insidePanel.color);
    } else {
      this.state.set({ customBg: false });
    }
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
    return this.state.get('edit');
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
    this.store
      .select(selectPanels)
      .pipe(take(1))
      .subscribe((panels) => {
        this.findPanel(position, panels);
      });

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
      .pipe(first(), untilDestroyed(this))
      .subscribe((id) => {
        if (id === this.state.get('note').id) {
          this.edit();
        }
      });

    this.boardDragDirective.setHost(this);

    this.state
      .select('note')
      .pipe(untilDestroyed(this))
      .subscribe((note) => {
        this.nativeElement.style.transform = `translate(${note.position.x}px, ${note.position.y}px)`;
      });

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
        focus: focusId === state.note.id,
      };
    });

    this.state.connect(
      'highlight',
      this.store.select(isUserHighlighted(this.state.get('note').ownerId))
    );

    this.state.hold(this.state.select('focus'), (focus) => {
      if (focus && !this.state.get('edit')) {
        hotkeys('delete', this.state.get('note').id, () => {
          this.store.dispatch(
            BoardActions.removeNode({
              node: this.state.get('note'),
              nodeType: 'note',
            })
          );
        });

        hotkeys.setScope(this.state.get('note').id);
      } else {
        hotkeys.unbind('delete', this.state.get('note').id);
      }
    });
  }

  public focusTextarea() {
    (this.textarea.first.nativeElement as HTMLTextAreaElement).focus();
  }

  public ngAfterViewInit() {
    if (this.state.get('focus')) {
      this.focusTextarea();
    }
  }
}
