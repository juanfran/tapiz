import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LiveReactionStore } from './live-reaction.store';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';

const EMOJI_SIZE = 200 as const;

@Component({
  selector: 'tapiz-live-reaction-wall',
  imports: [],
  animations: [
    trigger('fadeInOut', [
      state(
        'void',
        style({
          opacity: 0,
        }),
      ),
      state(
        '*',
        style({
          opacity: 1,
        }),
      ),
      transition('* => *', [animate('0.1s')]),
    ]),
  ],
  template: `
    @for (emoji of emojis(); track $index) {
      <div
        [@fadeInOut]
        class="emoji"
        [style.left.px]="emoji.position.x - EMOJI_SIZE / 2"
        [style.top.px]="emoji.position.y - EMOJI_SIZE / 2">
        <img
          [width]="EMOJI_SIZE"
          [height]="EMOJI_SIZE"
          [src]="emoji.url" />
      </div>
    }
  `,
  host: {
    '[style.--emoji-size]': `'${EMOJI_SIZE}px'`,
  },
  styleUrls: ['./live-reaction-wall.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveReactionWallComponent {
  #liveReactionStore = inject(LiveReactionStore);
  EMOJI_SIZE = EMOJI_SIZE;

  emojis = this.#liveReactionStore.emojis;
}
