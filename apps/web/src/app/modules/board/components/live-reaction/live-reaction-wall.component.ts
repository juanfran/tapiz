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
  standalone: true,
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
      transition('* => void', [animate('0.2s')]),
      transition('void => *', [animate('0.5s')]),
    ]),
  ],
  template: `
    @for (emoji of emojis(); track $index) {
      <div
        [@fadeInOut]
        class="emoji"
        [style.left.px]="emoji.position.x"
        [style.top.px]="emoji.position.y">
        <img
          width="100"
          height="100"
          src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/{{
            emoji.emoji
          }}" />
      </div>
    }
  `,
  styleUrl: './live-reaction-wall.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveReactionWallComponent {
  #liveReactionStore = inject(LiveReactionStore);

  emojis = this.#liveReactionStore.emojis;
}
