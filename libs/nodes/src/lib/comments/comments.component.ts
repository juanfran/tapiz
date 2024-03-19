import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  Injector,
  ElementRef,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommentsStore } from './comments.store';
import { CommentsInputComponent } from './components/comments-input/comments-input.component';
import { DatePipe } from '@angular/common';
import { TimeAgoPipe } from '@team-up/cdk/pipes/time-ago';
import { MatButtonModule } from '@angular/material/button';
import { animate, style, transition, trigger } from '@angular/animations';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { delay, map, startWith, take } from 'rxjs/operators';
import { CommentNode } from '@team-up/board-commons';
import { Store } from '@ngrx/store';
import { NodesStore } from '../services/nodes.store';
import { BoardActions } from '@team-up/board-commons/actions/board.actions';

@Component({
  selector: 'team-up-comments',
  standalone: true,
  imports: [
    MatIconModule,
    CommentsInputComponent,
    DatePipe,
    TimeAgoPipe,
    MatButtonModule,
  ],
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('200ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ],
  template: `
    @if (commentsStore.parentNodeId(); as parentNodeId) {
      <div class="wrapper">
        <div class="header">
          <button
            mat-icon-button
            (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div
          #commentWrapper
          board-noscroll
          [@.disabled]="animationDisabled()"
          class="comments">
          @for (comment of comments(); track $index) {
            <div
              class="comment"
              @fade>
              <div class="comment-header">
                <span class="username">{{ comment.username }}</span>
                <span class="date">{{ comment.date | timeAgo }}</span>
              </div>
              <p class="comment-text">{{ comment.text }}</p>
            </div>
          }
        </div>

        <team-up-comments-input
          [parentId]="parentNodeId"
          [userId]="userId()"
          (newComment)="newComment($event)" />
      </div>
    }
  `,
  styleUrls: ['./comments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsComponent {
  commentsStore = inject(CommentsStore);
  #nodesStore = inject(NodesStore);
  #store = inject(Store);
  #injector = inject(Injector);

  commentWrapper =
    viewChild.required<ElementRef<HTMLElement>>('commentWrapper');

  comments = computed(() => {
    const users = this.#nodesStore.users();
    const comments = this.commentsStore.comments();

    return comments.map((comment) => {
      const user = users.find((it) => it.id === comment.content.userId);

      return {
        ...comment.content,
        username: user?.name ?? 'Unknown',
      };
    });
  });

  animationDisabled = toSignal(
    toObservable(this.commentsStore.parentNodeId).pipe(
      delay(20),
      map((parentId) => !parentId),
      startWith(true),
    ),
  );

  userId = this.#nodesStore.userId;

  close() {
    this.commentsStore.clear();
  }

  newComment(comment: CommentNode) {
    toObservable(this.comments, {
      injector: this.#injector,
    })
      .pipe(take(1), delay(20))
      .subscribe(() => {
        this.commentWrapper().nativeElement.scrollTop =
          this.commentWrapper().nativeElement.scrollHeight;
      });

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          {
            op: 'add',
            parent: this.commentsStore.parentNodeId(),
            data: comment,
          },
        ],
      }),
    );
  }
}
