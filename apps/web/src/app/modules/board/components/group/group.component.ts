import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  HostBinding,
  computed,
  inject,
  viewChild,
  signal,
  afterNextRender,
  effect,
  DestroyRef,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Group, TuNode } from '@tapiz/board-commons';
import { ResizeHandlerSingleComponent } from '@tapiz/ui/resize';
import { hostBinding } from 'ngxtension/host-binding';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { NodesStore } from '../../services/nodes.store';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { NodeStore } from '../../services/node.store';
import { MultiDragService } from '@tapiz/cdk/services/multi-drag.service';
import { input } from '@angular/core';
import { BoardFacade } from '../../../../services/board-facade.service';
import { boardPageFeature } from '../../reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-group',
  template: `
    <div
      class="title"
      #title>
      @if (edit()) {
        <span
          #textarea
          class="textarea"
          role="textbox"
          (input)="setText($event)"
          (keydown.enter)="enter($event)"
          (focus)="selectTextarea($event)"
          contenteditable
          >{{ editText() }}</span
        >
      }
      @if (!edit()) {
        {{ node().content.title }}
        @if (votes() > 0) {
          <div class="vote">
            {{ votes() }}
          </div>
        }
      }
    </div>
    <tapiz-resize-single
      [node]="node()"
      (initResize)="initResize()" />
  `,
  styleUrls: ['./group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResizeHandlerSingleComponent],
})
export class GroupComponent {
  #nodesStore = inject(NodesStore);
  #nodeStore = inject(NodeStore);
  #store = inject(Store);
  #el = inject(ElementRef);
  #multiDragService = inject(MultiDragService);
  #destroyRef = inject(DestroyRef);
  #boardFacade = inject(BoardFacade);
  #activeToolbarOption = this.#store.selectSignal(
    boardPageFeature.selectPopupOpen,
  );
  #userVotes = this.#store.selectSignal(boardPageFeature.selectShowUserVotes);

  node = input.required<TuNode<Group>>();

  pasted = input.required<boolean>();

  focus = input.required<boolean>();

  @HostBinding('class.focus') get focusClass() {
    return this.focus();
  }

  voting = hostBinding(
    'class.voting',
    computed(() => {
      return this.#activeToolbarOption() === 'vote';
    }),
  );

  votes = computed(() => {
    return this.node().content.votes.reduce((prev, it) => {
      return prev + it.vote;
    }, 0);
  });

  textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');
  userId = this.#boardFacade.userId;
  edit = signal(false);
  editText = signal('');

  constructor() {
    afterNextRender(() => {
      if (this.focus() && !this.pasted()) {
        this.initEdit();
      }

      this.#multiDragService.register({
        id: this.node().id,
        nodeType: 'group',
        handler: this.nativeElement,
        position: () => this.node().content.position,
        destroyRef: this.#destroyRef,
      });
    });

    const highlight = computed(() => {
      const votes = this.node().content.votes.find(
        (vote) => vote.userId === this.#userVotes(),
      );

      return !!votes;
    });

    explicitEffect([highlight], ([highlight]) => {
      this.#nodeStore.updateState({
        highlight,
      });
    });

    explicitEffect([this.focus], ([focus]) => {
      if (!focus) {
        this.edit.set(false);
      }
    });

    effect(() => {
      this.textarea()?.nativeElement.focus();
    });
  }

  @HostListener('mousedown', ['$event'])
  public mousedown(event: MouseEvent) {
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
                  type: 'group',
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
    if (this.voting()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!this.voting()) {
      this.initEdit();
    }
  }

  initEdit() {
    this.edit.set(true);
    this.editText.set(this.node().content.title);
  }

  public enter(event: Event) {
    event.preventDefault();

    this.textarea()?.nativeElement.blur();
    this.#nodesStore.setFocusNode({
      id: '',
      ctrlKey: false,
    });
  }

  public setText(event: Event) {
    if (event.target) {
      const value = (event.target as HTMLElement).innerText;

      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'group',
                id: this.node().id,
                content: {
                  title: value.trim(),
                },
              },
              op: 'patch',
            },
          ],
        }),
      );
    }
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

  public get nativeElement(): HTMLElement {
    return this.#el.nativeElement as HTMLElement;
  }

  initResize() {
    this.#nodesStore.setFocusNode({
      id: this.node().id,
      ctrlKey: false,
    });
  }
}
