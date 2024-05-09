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
import { NodeSpaceComponent } from '../node-space';

@Component({
  selector: 'team-up-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [DrawingDirective, MatIconModule, NodeSpaceComponent],
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
  emojiMode = hostBinding(
    'class.emoji-mode',
    computed(() => {
      return this.#nodesStore.activeToolbarOption() === 'emoji';
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
    return this.#noteHeight(
      this.node().content.width,
      this.node().content.height,
      this.node().content.text,
      '"Open Sans", -apple-system, system-ui, sans-serif',
    );
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
      this.#voteEvent(event);
    } else if (this.emojiMode()) {
      this.#emojiEvent(event);
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
    const width = this.node().content.width;
    const height = this.node().content.height;

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

  #noteHeight(
    width: number,
    height: number,
    text: string,
    font: string,
  ): number {
    const container = document.querySelector('#size-calculator');
    const minFontSize = 1;
    const maxFontSize = 56;
    let fontSize = maxFontSize;
    const increment = 1;

    if (!container) {
      return maxFontSize;
    }

    const div = document.createElement('div');
    const textDiv = document.createElement('div');
    const padding = 10;
    const nameHeight = 28;

    div.style.overflow = 'scroll-y';
    div.style.width = `${width}px`;
    div.style.height = `${height - nameHeight}px`;
    div.style.padding = `${padding}px`;
    div.style.position = 'absolute';
    div.style.top = '-1000px';
    div.id = 'textDivCalculator';
    textDiv.style.fontFamily = font;
    textDiv.style.overflowWrap = 'break-word';
    textDiv.style.whiteSpace = 'pre-wrap';
    textDiv.style.lineHeight = '1.1';

    textDiv.innerText = text;
    div.appendChild(textDiv);

    container.appendChild(div);

    while (fontSize >= minFontSize) {
      textDiv.style.fontSize = `${fontSize}px`;

      if (textDiv.clientHeight + padding / 2 < div.clientHeight) {
        break;
      }

      fontSize -= increment;
    }

    container.removeChild(div);

    return fontSize - increment;
  }

  #voteEvent(event: MouseEvent) {
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
  }

  #emojiEvent(event: MouseEvent) {
    const zoom = this.#nodesStore.zoom();
    const { width, height } = this.emojisSize();
    const targetPosition = this.nativeElement.getBoundingClientRect();

    if (event.button === 0) {
      const emoji = this.#nodesStore.emoji();

      if (!emoji) {
        return;
      }

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
    } else {
      const emojis = this.node().content.emojis.filter((emoji) => {
        const x = (event.clientX - targetPosition.left) / zoom;
        const y = (event.clientY - targetPosition.top) / zoom;

        console.log(event.clientX, emoji.position.x, width, height);

        return !(
          x >= emoji.position.x &&
          x <= emoji.position.x + width &&
          y >= emoji.position.y &&
          y <= emoji.position.y + height
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
  }
}
