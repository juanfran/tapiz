import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import emojisSmiles from './emojis-smiles';
import emojisHandGestures from './emojis-hand-gestures';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { BoardMoveService } from '../../services/board-move.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Store } from '@ngrx/store';
import { PageActions } from '../../actions/page.actions';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { LiveReactionStore } from './live-reaction.store';

const emojis = [
  ...emojisSmiles.map((emoji) => {
    return `/Smilies/${emoji}`;
  }),
  ...emojisHandGestures.map((emoji) => {
    return `/Hand%20gestures/${emoji}`;
  }),
];

@Component({
  selector: 'tapiz-live-reaction',
  standalone: true,
  imports: [InfiniteScrollDirective],
  template: `
    <div
      infiniteScroll
      [infiniteScrollDistance]="2"
      [infiniteScrollThrottle]="50"
      [scrollWindow]="false"
      (scrolled)="onScroll()"
      class="list">
      @for (emoji of emojis; track $index) {
        <button
          type="button"
          [class.selected]="selected() === emoji"
          (click)="selected.set(emoji)">
          <img
            [src]="
              'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/' +
              emoji
            "
            width="100"
            height="100" />
        </button>
      }
    </div>
  `,
  styleUrl: './live-reaction.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveReactionComponent {
  emojis = emojis.slice(0, 30);
  #boardMoveService = inject(BoardMoveService);
  #store = inject(Store);
  #liveReactionStore = inject(LiveReactionStore);
  selected = signal<string>('');

  constructor() {
    explicitEffect([this.selected], ([selected]) => {
      if (selected) {
        this.#store.dispatch(PageActions.setNodeSelection({ enabled: false }));
        this.#store.dispatch(
          PageActions.setBoardCursor({ cursor: 'crosshair' }),
        );
      } else {
        this.#store.dispatch(PageActions.setBoardCursor({ cursor: 'default' }));
        this.#store.dispatch(PageActions.setNodeSelection({ enabled: true }));
      }
    });

    this.#boardMoveService
      .relativeMouseDown()
      .pipe(
        takeUntilDestroyed(),
        filter(() => !!this.selected()),
      )
      .subscribe((data) => {
        this.#liveReactionStore.broadcast(this.selected(), {
          x: data.position.x - 50,
          y: data.position.y - 50,
        });
      });
  }

  onScroll() {
    if (this.emojis.length >= emojis.length) {
      return;
    }

    this.emojis.push(
      ...emojis.slice(this.emojis.length, this.emojis.length + 20),
    );
  }
}
