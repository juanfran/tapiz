import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  Signal,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { PollBoard, PollBoardNode } from '@team-up/board-commons';
import { encrypt } from '@team-up/utils/crypto';
import { MatIconModule } from '@angular/material/icon';
import { MultiDragService } from '@team-up/cdk/services/multi-drag.service';
import { Store } from '@ngrx/store';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PollConfigComponent } from './components/poll-config/poll-config.component';
import { PollOptionsComponent } from './components/poll-options/poll-options.component';
import { v4 } from 'uuid';
import { NodesStore } from '../services/nodes.store';
import { CommonModule } from '@angular/common';
import { PollResultsComponent } from './components/poll-results/poll-results.component';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';

@Component({
  selector: 'team-up-poll-board',
  standalone: true,
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
            <team-up-poll-results
              [node]="node()"
              [users]="users()" />
          } @else {
            <team-up-poll-options
              [node]="node()"
              [userId]="userId()"
              (vote)="setUserVote($event)"
              (resetVote)="resetVote($event)"
              (endPoll)="endPoll()" />
          }
        } @else {
          <team-up-poll-config
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
  @Input({ required: true })
  node!: Signal<PollBoardNode>;

  @Input()
  pasted!: Signal<boolean>;

  @Input()
  focus!: Signal<boolean>;

  @ViewChild('drag')
  drag!: ElementRef<HTMLButtonElement>;

  #el = inject(ElementRef<HTMLElement>);
  #store = inject(Store);
  #multiDragService = inject(MultiDragService);
  #destroyRef = inject(DestroyRef);
  #nodesStore = inject(NodesStore);
  userId = this.#nodesStore.userId;
  users = this.#nodesStore.users;
  canvasMode = this.#nodesStore.canvasMode;
  showDrag = computed(() => {
    if (this.canvasMode() === 'editMode') {
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

  zIndex = 6;

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
      const privateId = this.#nodesStore.privateId();

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
