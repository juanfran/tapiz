import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { TokenColors, tokenColorForId } from '@tapiz/cdk/utils/colors';
import { BoardFacade } from '../../../../services/board-facade.service';
import { output } from '@angular/core';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'tapiz-token-selector',
  styleUrls: ['./token-selector.component.scss'],
  template: `
    @if (!isDemo) {
      <div class="tokens">
        <h3 class="title">Team</h3>
        <div class="token-list">
          @for (user of users(); track user.id) {
            <button
              type="button"
              [style.background-color]="user.backgroundColor"
              [style.color]="user.color"
              class="token"
              (click)="
                selectUserToken(user.name, user.color, user.backgroundColor)
              ">
              {{ user.name }}
            </button>
          }
        </div>
      </div>
    }
    <div class="tokens">
      <h3 class="title">Tokens</h3>
      <div class="token-list">
        @for (bColor of colors; track bColor.backgroundColor) {
          <button
            type="button"
            class="token"
            [style.background-color]="bColor.backgroundColor"
            [style.color]="bColor.color"
            (click)="
              selectUserToken('', bColor.color, bColor.backgroundColor)
            "></button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokenSelectorComponent {
  selectToken = output<{
    text: string;
    color: string;
    backgroundColor: string;
  }>();

  #boardFacade = inject(BoardFacade);
  #configService = inject(ConfigService);

  users = computed(() => {
    return this.#boardFacade.users().map((user) => {
      const palette = tokenColorForId(user.id);
      return {
        id: user.id,
        name: user.name
          .split(' ')
          .slice(0, 2)
          .map((it) => it[0])
          .join('')
          .toUpperCase(),
        backgroundColor: palette.backgroundColor,
        color: palette.color,
      };
    });
  });

  colors = TokenColors;

  get isDemo() {
    return !!this.#configService.config.DEMO;
  }

  selectUserToken(text: string, color: string, backgroundColor: string) {
    this.selectToken.emit({ text, color, backgroundColor });
  }
}
