import { Point } from '@angular/cdk/drag-drop';
import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  HostBinding,
  inject,
  computed,
  signal,
  effect,
  DestroyRef,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Drawing, Note, Panel, TuNode, isPanel } from '@team-up/board-commons';
import { lighter } from '@team-up/cdk/utils/colors';
import {
  DrawingDirective,
  DrawingStore,
} from '@team-up/board-components/drawing';
import { HistoryService } from '../services/history.service';
import { MatIconModule } from '@angular/material/icon';
import { NodesStore } from '../services/nodes.store';
import { CommentsStore } from '../comments/comments.store';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';
import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';
import { hostBinding } from 'ngxtension/host-binding';
import { NodeStore } from '../node/node.store';
import { input } from '@angular/core';
import {
  applyToPoint,
  compose,
  inverse,
  rotateDEG,
  translate,
} from 'transformation-matrix';
import { HotkeysService } from '@team-up/cdk/services/hostkeys.service';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

@Component({
  selector: 'team-up-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [DrawingDirective, MatIconModule],
  host: {
    '[class.drawing]': 'drawing()',
    '[class.active-layer]': 'activeLayer()',
  },
  providers: [HotkeysService],
})
export class NoteComponent {
  #commentsStore = inject(CommentsStore);
  #destroyRef = inject(DestroyRef);
  #multiDragService = inject(MultiDragService);
  #el = inject(ElementRef);
  #store = inject(Store);
  #historyService = inject(HistoryService);
  #drawingStore = inject(DrawingStore);
  #nodesStore = inject(NodesStore);
  #nodeStore = inject(NodeStore);
  #hotkeysService = inject(HotkeysService);

  node = input.required<TuNode<Note>>();

  pasted = input.required<boolean>();

  focus = input.required<boolean>();

  @HostBinding('class.focus') get focusClass() {
    return this.focus();
  }

  drawing = this.#drawingStore.drawing;
  voting = hostBinding(
    'class.voting',
    computed(() => {
      return this.#nodesStore.activeToolbarOption() === 'vote';
    }),
  );
  visible = hostBinding(
    'class.visible',
    computed(() => {
      if (this.isOwner()) {
        return true;
      }

      return this.user()?.visible ?? true;
    }),
  );

  activeLayer = computed(() => {
    return this.#nodeStore.layer() === this.node().content.layer;
  });

  votes = computed(() => {
    return this.node().content.votes.reduce((prev, it) => {
      return prev + it.vote;
    }, 0);
  });

  username = computed(() => {
    const users = this.#nodesStore.users();
    const user = users.find((user) => this.node().content.ownerId === user.id);

    return user?.name ?? '';
  });

  textarea = viewChild<ElementRef>('textarea');
  textSize = computed(() => {
    const realSize = 250;

    const sizeSearch = (fontSize: number): number => {
      const height = this.#noteHeight(
        this.node().content.text,
        realSize,
        `${fontSize}px "Open Sans", -apple-system, system-ui, sans-serif`,
        1.1,
      );

      if (height > realSize - 10) {
        return sizeSearch(fontSize - 1);
      }

      return fontSize;
    };

    return sizeSearch(56);
  });

  userId = this.#nodesStore.userId;
  user = computed(() => {
    return this.#nodesStore
      .users()
      .find((it) => it.id === this.node().content.ownerId);
  });
  comments = computed(() => {
    return this.node().children?.filter((it) => it.type === 'comment').length;
  });
  edit = signal(false);
  initialText = signal('');
  editText = signal('');
  ownerId = computed(() => {
    return this.user()?.id;
  });
  color = computed(() => {
    const panels = this.#nodesStore.nodes().filter(isPanel);

    const position = this.node().content.position;
    const defaultColor = this.node().content.color ?? '#fdab61';
    return this.findColor(position, panels, defaultColor);
  });

  constructor() {
    const highlight = computed(() => {
      const userId = this.ownerId();
      const isUserHighlighted = this.#nodesStore.userHighlight() === userId;

      if (isUserHighlighted) {
        return true;
      }

      const votes = this.node().content.votes.find(
        (vote) => vote.userId === this.#nodesStore.userVotes(),
      );

      return !!votes;
    });

    toObservable(this.focus)
      .pipe(
        takeUntilDestroyed(),
        switchMap((focus) => {
          if (focus) {
            return this.#hotkeysService.listen({ key: 'Escape' });
          }
          return [];
        }),
      )
      .subscribe(() => {
        this.edit.set(false);
      });

    effect(
      () => {
        this.#nodeStore.updateState({
          highlight: highlight(),
        });
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      this.#el.nativeElement.style.setProperty(
        '--text-size',
        `${this.textSize()}px`,
      );
    });

    effect(() => {
      if (this.edit()) {
        this.#historyService.initEdit(this.node());
      } else {
        this.#historyService.finishEdit(this.node());
      }
    });

    effect(
      () => {
        if (!this.focus()) {
          this.edit.set(false);
        }
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      this.textarea()?.nativeElement.focus();
    });

    effect(() => {
      const color = this.color();

      if (color) {
        this.setColor(color);
      }
    });

    afterNextRender(() => {
      if (this.focus() && !this.pasted()) {
        this.initEdit();
      }

      this.#multiDragService.register({
        id: this.node().id,
        nodeType: 'note',
        handler: this.nativeElement,
        position: () => this.node().content.position,
        destroyRef: this.#destroyRef,
      });
    });
  }

  @HostListener('mousedown', ['$event'])
  mousedown(event: MouseEvent) {
    // prevent select word on dblclick
    if (!this.edit()) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.voting()) {
      let votes = this.node().content.votes;

      let currentUserVote = votes.find((vote) => vote.userId === this.userId());

      if (currentUserVote) {
        votes = votes.map((vote) => {
          if (vote.userId === this.userId()) {
            return {
              ...vote,
              vote: event.button === 2 ? vote.vote - 1 : vote.vote + 1,
            };
          }

          return vote;
        });
      } else {
        votes = [
          ...votes,
          {
            userId: this.userId(),
            vote: event.button === 2 ? -1 : 1,
          },
        ];
      }

      currentUserVote = votes.find((vote) => vote.userId === this.userId());

      votes = votes.filter((vote) => vote.vote !== 0);

      if (currentUserVote && currentUserVote.vote >= 0) {
        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions: [
              {
                data: {
                  type: 'note',
                  id: this.node().id,
                  content: {
                    votes,
                  },
                },
                op: 'patch',
              },
            ],
          }),
        );
      }
    } else {
      this.#nodesStore.setFocusNode({
        id: this.node().id,
        ctrlKey: event.ctrlKey,
      });
    }
  }

  @HostListener('dblclick', ['$event'])
  dblclick(event: MouseEvent) {
    if (this.drawing() || !this.visible()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!this.voting()) {
      this.initEdit();
    }
  }

  @HostListener('click', ['$event'])
  emoji(event: MouseEvent) {
    const emoji = this.#nodesStore.emoji();

    if (!emoji) {
      return;
    }

    const zoom = this.#nodesStore.zoom();
    const { width, height } = this.emojisSize();
    const targetPosition = this.nativeElement.getBoundingClientRect();
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [
          {
            data: {
              type: 'note',
              id: this.node().id,
              content: {
                emojis: [
                  ...this.node().content.emojis,
                  {
                    unicode: emoji.unicode,
                    position: {
                      x:
                        (event.clientX - targetPosition.left) / zoom -
                        width / 2,
                      y:
                        (event.clientY - targetPosition.top) / zoom -
                        height / 2,
                    },
                  },
                ],
              },
            },
            op: 'patch',
          },
        ],
      }),
    );
  }

  @HostListener('contextmenu', ['$event'])
  removeEmoji(event: MouseEvent) {
    const option = this.#nodesStore.activeToolbarOption();

    if (option !== 'emoji') {
      return;
    }

    const zoom = this.#nodesStore.zoom();

    const targetPosition = this.nativeElement.getBoundingClientRect();
    const { width, height } = this.emojisSize();

    const clientX = (event.clientX - targetPosition.left) / zoom;
    const clientY = (event.clientY - targetPosition.top) / zoom;

    const emojis = this.node().content.emojis.filter((emoji) => {
      return !(
        clientX >= emoji.position.x &&
        clientX <= emoji.position.x + width &&
        clientY >= emoji.position.y &&
        clientY <= emoji.position.y + height
      );
    });

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions: [
          {
            data: {
              type: 'note',
              id: this.node().id,
              content: {
                emojis: [...emojis],
              },
            },
            op: 'patch',
          },
        ],
      }),
    );
  }

  emojisSize() {
    const styles = getComputedStyle(this.nativeElement);

    const width = Number(
      styles.getPropertyValue('--emoji-width').replace('px', ''),
    );
    const height = Number(
      styles.getPropertyValue('--emoji-height').replace('px', ''),
    );

    return { width, height };
  }

  isOwner() {
    return this.userId() === this.node().content.ownerId;
  }

  findColor(position: Point, panels: TuNode<Panel>[], defaultColor: string) {
    const width = 300;
    const height = 300;

    const insidePanel = panels.find((panel) => {
      const transform = compose(
        translate(panel.content.position.x, panel.content.position.y),
        rotateDEG(panel.content.rotation),
      );

      const inverseTransform = inverse(transform);

      const corners = [
        { x: position.x, y: position.y },
        { x: position.x + width, y: position.y },
        { x: position.x, y: position.y + height },
        { x: position.x + width, y: position.y + height },
      ];

      return corners.every((corner) => {
        const transformedCorner = applyToPoint(inverseTransform, corner);
        return (
          transformedCorner.x >= 0 &&
          transformedCorner.x <= panel.content.width &&
          transformedCorner.y >= 0 &&
          transformedCorner.y <= panel.content.height
        );
      });
    });

    if (insidePanel?.content.color) {
      return insidePanel?.content.color;
    }

    return defaultColor;
  }

  setColor(color: string) {
    this.nativeElement.style.setProperty('--custom-fg', '#000');
    this.nativeElement.style.setProperty('--custom-bg', lighter(color, 70));
    this.nativeElement.style.setProperty('--custom-main', color);
  }

  initEdit() {
    this.initialText.set(this.node().content.text);
    this.edit.set(true);
    this.editText.set(this.node().content.text);
  }

  setText(event: Event) {
    if (event.target) {
      const value = (event.target as HTMLTextAreaElement).value;

      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              data: {
                type: 'note',
                id: this.node().id,
                content: {
                  text: value,
                },
              },
              op: 'patch',
            },
          ],
        }),
      );
    }
  }

  selectTextarea($event: FocusEvent) {
    const target = $event.target as HTMLTextAreaElement;

    target.select();
  }

  get nativeElement(): HTMLElement {
    return this.#el.nativeElement as HTMLElement;
  }

  get id() {
    return this.node().id;
  }

  setDrawing(newLine: Drawing[]) {
    this.#drawingStore.actions.setDrawing({
      id: this.node().id,
      type: 'note',
      drawing: [...this.node().content.drawing, ...newLine],
      history: true,
    });
  }

  openComments() {
    this.#commentsStore.setParentNode(this.node().id);
  }

  #noteHeight(texto: string, width: number, font: string, lineHeight: number) {
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
