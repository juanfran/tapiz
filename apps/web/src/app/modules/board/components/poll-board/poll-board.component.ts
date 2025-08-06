import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { PollBoard, PollBoardNode } from '@tapiz/board-commons';
import { encrypt } from '@tapiz/utils/crypto';
import { MatIconModule } from '@angular/material/icon';
import { MultiDragService } from '@tapiz/cdk/services/multi-drag.service';
import { Store } from '@ngrx/store';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PollConfigComponent } from './components/poll-config/poll-config.component';
import { PollOptionsComponent } from './components/poll-options/poll-options.component';
import { v4 } from 'uuid';
import { CommonModule } from '@angular/common';
import { PollResultsComponent } from './components/poll-results/poll-results.component';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { input } from '@angular/core';
import { BoardFacade } from '../../../../services/board-facade.service';
import { boardPageFeature } from '../../reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-poll-board',
  imports: [
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    PollConfigComponent,
    PollOptionsComponent,
    PollResultsComponent,
    CommonModule,
  ],

  template: `
    <div
      class="drag-indicator"
      [style.visibility]="showDrag() ? 'visible' : 'hidden'">
      <button #drag>
        <mat-icon>drag_indicator</mat-icon>
      </button>
    </div>
    <div
      class="wrapper"
      [class.focus]="focus()">
      @if (node().content; as nodeContent) {
        @if (nodeContent.options.length) {
          <h1>{{ nodeContent.title }}</h1>

          @if (nodeContent.finished) {
            <tapiz-poll-results
              [node]="node()"
              [users]="users()" />
          } @else {
            <tapiz-poll-options
              [node]="node()"
              [userId]="userId()"
              (vote)="setUserVote($event)"
              (resetVote)="resetVote($event)"
              (endPoll)="endPoll()" />
          }
        } @else {
          <tapiz-poll-config
            [node]="node()"
            (nodeChange)="updateNode($event)" />
        }
      }
    </div>
  `,
  styleUrls: ['./poll-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollBoardComponent implements AfterViewInit {
  node = input.required<PollBoardNode>();

  pasted = input.required<boolean>();

  focus = input.required<boolean>();

  @ViewChild('drag')
  drag!: ElementRef<HTMLButtonElement>;

  #el = inject(ElementRef<HTMLElement>);
  #store = inject(Store);
  #multiDragService = inject(MultiDragService);
  #destroyRef = inject(DestroyRef);
  #boardFacade = inject(BoardFacade);
  userId = this.#boardFacade.userId;
  users = this.#boardFacade.users;
  boardMode = this.#store.selectSignal(boardPageFeature.selectBoardMode);
  privateId = this.#store.selectSignal(boardPageFeature.selectPrivateId);

  showDrag = computed(() => {
    if (this.boardMode() === 0) {
      return this.node().content.layer === 0;
    } else {
      return this.node().content.layer === 1;
    }
  });

  get nativeElement() {
    return this.#el.nativeElement;
  }

  get id() {
    return this.node().id;
  }

  get nodeType() {
    return this.node().type;
  }

  get position() {
    return this.node().content.position;
  }

  get handler() {
    return this.drag.nativeElement;
  }

  zIndex = signal(6);

  updateNode(content: Partial<PollBoard>) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        actions: [
          {
            op: 'patch',
            data: {
              id: this.node().id,
              type: 'poll',
              content,
            },
          },
        ],
      }),
    );
  }

  async setUserVote(optionId: string) {
    if (optionId) {
      const isPrivate = this.node().content.mode === 'anonymous';
      const privateId = this.privateId();

      const userId = isPrivate
        ? await encrypt(this.userId(), privateId)
        : this.userId();

      this.#store.dispatch(
        BoardActions.batchNodeActions({
          actions: [
            {
              op: 'add',
              parent: this.node().id,
              data: {
                id: v4(),
                type: 'poll.answer',
                content: {
                  optionId,
                  userId,
                },
              },
            },
          ],
        }),
      );
    }
  }

  resetVote(id: string) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        actions: [
          {
            op: 'remove',
            parent: this.node().id,
            data: {
              id,
              type: 'poll.answer',
            },
          },
        ],
      }),
    );
  }

  endPoll() {
    this.updateNode({ finished: true });
  }

  ngAfterViewInit() {
    this.#multiDragService.register({
      id: this.id,
      nodeType: this.nodeType,
      handler: this.drag.nativeElement,
      position: () => this.position,
      destroyRef: this.#destroyRef,
    });
  }
}
