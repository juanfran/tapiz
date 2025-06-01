import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LiveReactionStore } from './live-reaction.store';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';

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
        [style.left.px]="emoji.position.x - 100"
        [style.top.px]="emoji.position.y - 100">
        <img
          width="200"
          height="200"
          [src]="emoji.url" />
      </div>
    }
  `,
  styleUrls: ['./live-reaction-wall.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveReactionWallComponent {
  #liveReactionStore = inject(LiveReactionStore);

  emojis = this.#liveReactionStore.emojis;
}
