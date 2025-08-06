import { Point } from '@angular/cdk/drag-drop';
import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  inject,
  computed,
  signal,
  effect,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Drawing, Note, Panel, TuNode, isPanel } from '@tapiz/board-commons';
import { contrast, lighter } from '@tapiz/cdk/utils/colors';
import { insideNode } from '@tapiz/cdk/utils/inside-node';
import { PortalComponent } from '@tapiz/ui/portal';
import { DrawingDirective, DrawingStore } from '../drawing';
import { HistoryService } from '../../services/history.service';
import { MatIconModule } from '@angular/material/icon';
import { NodesStore } from '../../services/nodes.store';
import { CommentsStore } from '../comments/comments.store';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { hostBinding } from 'ngxtension/host-binding';
import { NodeStore } from '../../services/node.store';
import { input } from '@angular/core';
import { HotkeysService } from '@tapiz/cdk/services/hostkeys.service';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { NodeSpaceComponent } from '../node-space';
import { SafeHtmlPipe } from '@tapiz/cdk/pipes/safe-html';
import { EditorViewComponent } from '@tapiz/ui/editor-view';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { EditorPortalComponent } from '../editor-portal/editor-portal.component';
import { NoteHeightCalculatorService } from './components/note-height-calculator/note-height-calculator.service';
import { defaultNoteColor } from '.';
import { BoardFacade } from '../../../../services/board-facade.service';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { BoardPageActions } from '../../actions/board-page.actions';
import { NodeToolbarComponent } from '../node-toolbar/node-toolbar.component';

@Component({
  selector: 'tapiz-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DrawingDirective,
    MatIconModule,
    NodeSpaceComponent,
    SafeHtmlPipe,
    EditorViewComponent,
    EditorPortalComponent,
    PortalComponent,
    NodeToolbarComponent,
  ],
  host: {
    '[class.drawing]': 'drawing()',
    '[class.voting]': 'voting()',
    '[class.focus]': 'focus()',
    '[class.emoji-mode]': 'emojiMode()',
    '[class.active-layer]': 'activeLayer()',
    '[class.drop-animation]': 'dropAnimation()',
    '[class.drag-animation]': 'dragAnimation()',
    '[style.--custom-fg]': '"#000"',
    '[style.--custom-light]': 'lightColor()',
    '[style.--custom-main]': 'color()',
    '[style.--contrast-color]': 'contrastColor()',
    '[style.transform]': '"rotate(" + this.rotation() + "deg)"',
    '[style.--rotate-angle]': 'rotateAngle()',
  },
  providers: [HotkeysService, NoteHeightCalculatorService],
})
export class NoteComponent {
  #commentsStore = inject(CommentsStore);
  #el = inject(ElementRef);
  #store = inject(Store);
  #historyService = inject(HistoryService);
  #drawingStore = inject(DrawingStore);
  #nodesStore = inject(NodesStore);
  #nodeStore = inject(NodeStore);
  #hotkeysService = inject(HotkeysService);
  #boardFacade = inject(BoardFacade);
  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  dropAnimation = signal(false);
  dragAnimation = signal(false);
  noteHeightCalculatorService = inject(NoteHeightCalculatorService);
  #activeToolbarOption = this.#store.selectSignal(
    boardPageFeature.selectPopupOpen,
  );
  #toolbarPinned = this.#store.selectSignal(boardPageFeature.selectPopupPinned);
  #mentions = this.#store.selectSignal(boardPageFeature.selectMentions);
  #emoji = this.#store.selectSignal(boardPageFeature.selectEmoji);
  #userHighlight = this.#store.selectSignal(
    boardPageFeature.selectUserHighlight,
  );
  #userVotes = this.#store.selectSignal(boardPageFeature.selectShowUserVotes);
  #currentUserId = this.#store.selectSignal(boardPageFeature.selectUserId);
  showNoteAuthor = computed(() => {
    const noteUserId = this.node().content.ownerId;
    const currentUserId = this.#currentUserId();

    if (noteUserId === currentUserId) {
      return true;
    }

    return !(this.#boardFacade.settings()?.content.hideNoteAuthor ?? false);
  });

  zIndex = computed(() => {
    return this.edit() ? 2 : 1;
  });

  node = input.required<TuNode<Note>>();

  pasted = input.required<boolean>();

  focus = input.required<boolean>();
  height = computed(() => {
    return this.node().content.height;
  });
  width = computed(() => {
    return this.node().content.width;
  });
  bgColor = computed(() => {
    return this.node().content.color ?? defaultNoteColor;
  });

  rotation = signal(0);
  rotateAngle = signal('0deg');
  contrast = computed(() => {
    return contrast(this.bgColor(), '#ffffff');
  });
  contrastColor = computed(() => {
    return this.contrast() > 2 ? '#ffffff' : '#000000';
  });

  defaultTextColor = computed(() => {
    // if the note has text, the color is by the current text color
    if (this.node().content.text.length) {
      return null;
    }

    return this.contrast() > 2 ? '#ffffff' : '#000000';
  });

  generateRandomRotation() {
    let rotation: number;
    const aspectRatio = this.height() / this.width();
    do {
      if (aspectRatio > 2 || aspectRatio < 0.5) {
        rotation = Math.random() * 2.5 - 1.25; // Generates a number between -1.25 and 1.25
      } else {
        rotation = Math.random() * 5 - 2.5; // Generates a number between -2.5 and 2.5
      }
    } while (rotation > -0.5 && rotation < 0.5); // Ensures the number is not between -0.5 and 0.5
    return rotation;
  }

  editorView = viewChild<EditorViewComponent>('editorView');

  drawing = this.#drawingStore.drawing;
  voting = computed(() => {
    return this.#activeToolbarOption() === 'vote';
  });
  emojiMode = computed(() => {
    return this.#activeToolbarOption() === 'emoji';
  });
  cursor = computed(() => {
    if (this.drawing() || this.voting() || this.emojiMode()) {
      return 'crosshair';
    }

    return 'grab';
  });

  mentions = this.#mentions;

  visible = hostBinding(
    'class.visible',
    computed(() => {
      if (this.isOwner()) {
        return true;
      }

      if ((this.node().content.textHidden ?? null) !== null) {
        return !this.node().content.textHidden;
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
    const users = this.#boardFacade.users();
    const user = users.find((user) => this.node().content.ownerId === user.id);

    return user?.name ?? '';
  });

  #noteWidth = computed(() => {
    return this.node().content.width;
  });

  #noteHeight = computed(() => {
    return this.node().content.height;
  });

  #noteText = computed(() => {
    return this.node().content.text;
  });

  textSize = computed(() => {
    return this.noteHeightCalculatorService.newNoteHeight({
      height: this.#noteHeight(),
      width: this.#noteWidth(),
      text: this.#noteText(),
    });
  });

  userId = this.#store.selectSignal(boardPageFeature.selectUserId);
  user = computed(() => {
    return this.#boardFacade
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
    const panels = this.#boardFacade.nodes().filter(isPanel);

    const position = this.node().content.position;
    const defaultColor = this.node().content.color ?? defaultNoteColor;
    return this.findColor(position, panels, defaultColor);
  });
  lightColor = computed(() => {
    return lighter(this.color(), 70);
  });

  randomizeAngle(): void {
    const previousAngle = parseFloat(this.rotateAngle());
    let randomAngle;
    do {
      randomAngle = Math.floor(Math.random() * 13) - 6; // random angle between -6 and 6 degrees
    } while (
      randomAngle === previousAngle ||
      randomAngle === 2 ||
      randomAngle === -2
    );

    requestAnimationFrame(() => {
      this.rotateAngle.set(`${randomAngle}deg`);
    });
  }

  constructor() {
    const highlight = computed(() => {
      const userId = this.ownerId();
      const isUserHighlighted = this.#userHighlight() === userId;

      if (isUserHighlighted) {
        return true;
      }

      const votes = this.node().content.votes.find(
        (vote) => vote.userId === this.#userVotes(),
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

    explicitEffect([highlight], ([highlight]) => {
      this.#nodeStore.updateState({
        highlight,
      });
    });

    effect(() => {
      this.#el.nativeElement.style.setProperty(
        '--text-editor-font-size',
        `${this.textSize()}px`,
      );

      this.editorView()?.setTextSize(this.textSize());
    });

    explicitEffect([this.edit], ([edit]) => {
      if (edit) {
        this.#historyService.initEdit(this.node());
      } else {
        this.#historyService.finishEdit(this.node());
      }
    });

    explicitEffect([this.focus], ([focus]) => {
      if (!focus) {
        this.edit.set(false);
      }
    });

    afterNextRender(() => {
      if (this.focus() && !this.pasted()) {
        this.initEdit();
      }
    });

    explicitEffect([this.focus], ([focus]) => {
      if (focus) {
        this.rotation.set(0);
      } else {
        const rotation = this.generateRandomRotation();
        this.rotation.set(rotation);
      }
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

    const insidePanel = insideNode<Panel>(
      {
        position,
        width,
        height,
      },
      panels,
    );

    if (insidePanel?.content.color) {
      return insidePanel?.content.color;
    }

    return defaultColor;
  }

  initEdit() {
    this.initialText.set(this.node().content.text);
    this.edit.set(true);
    this.editText.set(this.node().content.text);
  }

  setText(value: string) {
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

  selectTextarea($event: FocusEvent) {
    const target = $event.target as HTMLTextAreaElement;

    target.select();
  }

  get nativeElement(): HTMLElement {
    return this.#el.nativeElement;
  }

  get id() {
    return this.node().id;
  }

  setDrawing(newLine: Drawing) {
    this.#drawingStore.setDrawing(
      this.node().id,
      'note',
      [...this.node().content.drawing, newLine],
      true,
    );
  }

  openComments() {
    this.#commentsStore.setParentNode(this.node().id);
  }

  onMention(userId: string) {
    this.#nodesStore.mentionUser(userId, this.node().id);
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
    const zoom = this.#zoom();
    const { width, height } = this.emojisSize();
    const targetPosition = this.nativeElement.getBoundingClientRect();

    if (event.button === 0) {
      const emoji = this.#emoji();

      if (!emoji || !('unicode' in emoji)) {
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

    if (!this.#toolbarPinned()) {
      this.#store.dispatch(BoardPageActions.setPopupOpen({ popup: '' }));
    }
  }

  onDrop() {
    const nativeElement: HTMLElement = this.#el.nativeElement;

    this.dragAnimation.set(false);
    this.dropAnimation.set(true);

    const onAnimationEnd = () => {
      this.dropAnimation.set(false);
      nativeElement.removeEventListener('animationend', onAnimationEnd);
    };

    nativeElement.addEventListener('animationend', onAnimationEnd);
  }

  onDrag() {
    this.randomizeAngle();
    this.dragAnimation.set(true);
  }
}
